// This client was generated by Platformatic from an OpenAPI specification.

import type { Movies } from './movies-types'
import type * as Types from './movies-types'

// The base URL for the API. This can be overridden by calling `setBaseUrl`.
let baseUrl = ''
function sanitizeUrl(url: string) : string {
  if (url.endsWith('/')) { return url.slice(0, -1) } else { return url }
}
export const setBaseUrl = (newUrl: string) : void => { baseUrl = sanitizeUrl(newUrl) }
type JSON = Record<string, unknown>
function headersToJSON(headers: Headers): JSON {
  const output: JSON = {}
  headers.forEach((value, key) => {
    output[key] = value
  })
  return output
}

const _getPkgScopeNameVersion = async (url: string, request: Types.GetPkgScopeNameVersionRequest): Promise<Types.GetPkgScopeNameVersionResponses> => {

  const response = await fetch(`${url}/pkg/@${request['scope']}/${request['name']}/${request['version']}/${request['*']}`)

  const textResponses = [302, 400]
  if (textResponses.includes(response.status)) {
    return {
      statusCode: response.status as 302 | 400,
      headers: headersToJSON(response.headers),
      body: await response.text()
    }
  }
  const blobResponses = [202]
  if (blobResponses.includes(response.status)) {
    return {
      statusCode: response.status as 202,
      headers: headersToJSON(response.headers),
      body: await response.blob()
    }
  }
  const jsonResponses = [200, 404]
  if (jsonResponses.includes(response.status)) {
    return {
      statusCode: response.status as 200 | 404,
      headers: headersToJSON(response.headers),
      body: await response.json()
    }
  }
  if (response.headers.get('content-type') === 'application/json') {
    return {
      statusCode: response.status as 200 | 202 | 302 | 400 | 404,
      headers: headersToJSON(response.headers),
      body: await response.json() as any
    }
  }
  return {
    statusCode: response.status as 200 | 202 | 302 | 400 | 404,
    headers: headersToJSON(response.headers),
    body: await response.text() as any
  }
}

export const getPkgScopeNameVersion: Movies['getPkgScopeNameVersion'] = async (request: Types.GetPkgScopeNameVersionRequest): Promise<Types.GetPkgScopeNameVersionResponses> => {
  return await _getPkgScopeNameVersion(baseUrl, request)
}
export default function build (url: string) {
  url = sanitizeUrl(url)
  return {
    getPkgScopeNameVersion: _getPkgScopeNameVersion.bind(url, ...arguments)
  }
}