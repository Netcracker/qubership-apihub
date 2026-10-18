export const IMAGE_CONTENT_TYPE = 'image'
export const JSON_CONTENT_TYPE = 'json'
export const XML_CONTENT_TYPE = 'xml'
export const TEXT_CONTENT_TYPE = 'text'
export const ANY_CONTENT_TYPE = 'any'

export type ContentType =
  | typeof IMAGE_CONTENT_TYPE
  | typeof JSON_CONTENT_TYPE
  | typeof XML_CONTENT_TYPE
  | typeof TEXT_CONTENT_TYPE
  | typeof ANY_CONTENT_TYPE

const regex: Record<ContentType, RegExp> = {
  image: /image\/(.?)*(jpeg|gif|png|svg)/,
  json: /application\/(.?)*json/,
  xml: /(text|application)\/(.?)*(xml|html)/,
  text: /text\/.*/,
  any: /.*\/.*/,
}

export function getResponseType(contentType: string) {
  return Object.keys(regex).find(type => {
    const reg = regex[type as ContentType]
    return reg.test(contentType)
  }) as ContentType | undefined
}
