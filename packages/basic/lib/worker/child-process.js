import { ITC } from '@platformatic/itc'
import { createPinoWritable, DestinationWritable } from '@platformatic/utils'
import { tracingChannel } from 'node:diagnostics_channel'
import { once } from 'node:events'
import { platform } from 'node:os'
import pino from 'pino'
import { getGlobalDispatcher, setGlobalDispatcher } from 'undici'
import { WebSocket } from 'ws'

function createInterceptor (itc) {
  return function (dispatch) {
    return async (opts, handler) => {
      let url = opts.origin
      if (!(url instanceof URL)) {
        url = new URL(opts.path, url)
      }

      // Other URLs are handled normally
      if (!url.hostname.endsWith('.plt.local')) {
        return dispatch(opts, handler)
      }

      const headers = {
        ...opts?.headers
      }

      delete headers.connection
      delete headers['transfer-encoding']
      headers.host = url.host

      const requestOpts = {
        ...opts,
        headers
      }
      delete requestOpts.dispatcher

      itc
        .send('fetch', requestOpts)
        .then(res => {
          if (res.rawPayload && !Buffer.isBuffer(res.rawPayload)) {
            res.rawPayload = Buffer.from(res.rawPayload.data)
          }

          const headers = []
          for (const [key, value] of Object.entries(res.headers)) {
            if (Array.isArray(value)) {
              for (const v of value) {
                headers.push(key)
                headers.push(v)
              }
            } else {
              headers.push(key)
              headers.push(value)
            }
          }

          handler.onHeaders(res.statusCode, headers, () => {}, res.statusMessage)
          handler.onData(res.rawPayload)
          handler.onComplete([])
        })
        .catch(e => {
          handler.onError(new Error(e.message))
        })

      return true
    }
  }
}

class ChildProcessWritable extends DestinationWritable {
  #itc

  constructor (options) {
    const { itc, ...opts } = options

    super(opts)
    this.#itc = itc
  }

  _send (message) {
    this.#itc.send('log', JSON.stringify(message))
  }
}

class ChildProcess extends ITC {
  #listener
  #socket
  #child
  #logger
  #pendingMessages

  constructor () {
    super({ throwOnMissingHandler: false })

    this.listen()
    this.#setupLogger()
    this.#setupServer()
    this.#setupInterceptors()
    this.#pendingMessages = []

    this.on('close', signal => {
      process.kill(process.pid, signal)
    })
  }

  _setupListener (listener) {
    this.#listener = listener

    const protocol = platform() === 'win32' ? 'ws+unix:' : 'ws+unix://'
    this.#socket = new WebSocket(`${protocol}${globalThis.platformatic.__pltSocketPath}`)

    this.#socket.on('open', () => {
      for (const message of this.#pendingMessages) {
        this.#socket.send(message)
      }
    })

    this.#socket.on('message', message => {
      this.#listener(JSON.parse(message))
    })

    this.#socket.on('error', () => {
      // There is nothing to log here as the connection with the parent thread is lost. Exit with a special code
      process.exit(2)
    })
  }

  _send (message) {
    if (this.#socket.readyState === WebSocket.CONNECTING) {
      this.#pendingMessages.push(JSON.stringify(message))
      return
    }

    this.#socket.send(JSON.stringify(message))
  }

  _createClosePromise () {
    return once(this.#socket, 'close')
  }

  _close () {
    this.#socket.close()
  }

  #setupLogger () {
    const destination = new ChildProcessWritable({ itc: this })
    this.#logger = pino(
      { level: 'info', name: globalThis.platformatic.id, ...globalThis.platformatic.logger },
      destination
    )

    Reflect.defineProperty(process, 'stdout', { value: createPinoWritable(this.#logger, 'info') })
    Reflect.defineProperty(process, 'stderr', { value: createPinoWritable(this.#logger, 'error') })
  }

  #setupServer () {
    const subscribers = {
      asyncStart ({ options }) {
        const port = globalThis.platformatic.port

        if (port !== false) {
          options.port = typeof port === 'number' ? port : 0
        }
      },
      asyncEnd: ({ server }) => {
        tracingChannel('net.server.listen').unsubscribe(subscribers)

        const { family, address, port } = server.address()
        const url = new URL(family === 'IPv6' ? `http://[${address}]:${port}` : `http://${address}:${port}`).origin

        this.notify('url', url)
      },
      error: error => {
        tracingChannel('net.server.listen').unsubscribe(subscribers)
        this.notify('error', error)
      }
    }

    tracingChannel('net.server.listen').subscribe(subscribers)
  }

  #setupInterceptors () {
    setGlobalDispatcher(getGlobalDispatcher().compose(createInterceptor(this)))
  }
}

globalThis[Symbol.for('plt.children.itc')] = new ChildProcess()
