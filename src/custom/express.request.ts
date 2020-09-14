import { Request } from 'express'

/*
 * With this piece of code we ca personalize the attributes of the request,
 * in case we need it.
 */

interface CustomRequest extends Request {
  args?: unknown
}

export { CustomRequest as Request }
