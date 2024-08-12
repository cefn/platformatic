/* globals platformatic */

'use strict'

const { printSchema } = require('graphql')

class ServiceStackable {
  constructor (options) {
    this.app = null
    this._init = options.init
    this.stackable = options.stackable
    this.serviceId = options.id

    this.configManager = options.configManager
    this.config = this.configManager.current
  }

  async init () {
    if (this.app === null) {
      this.app = await this._init()
    }
    return this.app
  }

  async start (options = {}) {
    await this.init()

    const action = options.listen ? 'start' : 'ready'

    await this.app[action]()

    if (globalThis.platformatic) {
      if (this.app.swagger) {
        platformatic.openAPISchema = this.app.swagger()
      }

      if (this.app.graphql) {
        platformatic.graphQLSchema = printSchema(this.app.graphql.schema)
      }
    }
  }

  async stop () {
    if (this.app === null) return
    await this.app.close()
  }

  getUrl () {
    return this.app !== null ? this.app.url : null
  }

  async getInfo () {
    const type = this.stackable.configType
    const version = this.stackable.configManagerConfig.version ?? null
    return { type, version }
  }

  async getConfig () {
    return this.configManager.current
  }

  async getDispatchFunc () {
    await this.init()
    return this.app
  }

  async getMetrics ({ format }) {
    await this.init()

    const promRegister = this.app.metrics?.client?.register
    if (!promRegister) return null

    return format === 'json' ? promRegister.getMetricsAsJSON() : promRegister.metrics()
  }

  async inject (injectParams) {
    await this.init()

    const { statusCode, statusMessage, headers, body } = await this.app.inject(injectParams)
    return { statusCode, statusMessage, headers, body }
  }

  async log (options = {}) {
    await this.init()

    const logLevel = options.level ?? 'info'

    const message = options.message
    if (!message) return

    this.app.log[logLevel](message)
  }
}

module.exports = { ServiceStackable }
