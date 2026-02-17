import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors';

type ValidationTarget = 'body' | 'params' | 'query';

interface ValidateOptions {
  body?: Joi.Schema;
  params?: Joi.Schema;
  query?: Joi.Schema;
}

/**
 * מידלוור ולידציה עם JOI.
 * יכול לאמת body, params ו/או query בנפרד.
 *
 * שימוש:
 *   validate({ body: schema })
 *   validate({ body: schema, params: paramsSchema })
 *   validate(bodySchema) // קיצור ל-body בלבד
 */
export function validate(schema: Joi.Schema | ValidateOptions) {
  // קיצור: validate(schema) = validate({ body: schema })
  const options: ValidateOptions =
    'body' in schema || 'params' in schema || 'query' in schema
      ? (schema as ValidateOptions)
      : { body: schema as Joi.Schema };

  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string }> = [];

    const targets: ValidationTarget[] = ['body', 'params', 'query'];

    for (const target of targets) {
      const targetSchema = options[target];
      if (!targetSchema) continue;

      const { error, value } = targetSchema.validate(req[target], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        for (const detail of error.details) {
          errors.push({
            field: target === 'body' ? detail.path.join('.') : `${target}.${detail.path.join('.')}`,
            message: detail.message,
          });
        }
      } else {
        // החלפה בערכים מאומתים
        req[target] = value;
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors));
    }

    next();
  };
}
