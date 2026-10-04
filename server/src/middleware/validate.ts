import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    schema
      .parseAsync({
        body: req.body as unknown,
        query: req.query as unknown,
        params: req.params as unknown,
      })
      .then((parsed) => {
        const record = parsed as Record<string, unknown>;
        req.body = record.body;
        req.query = record.query as Request['query'];
        req.params = record.params as Request['params'];
        next();
      })
      .catch((error: unknown) => {
        next(error);
      });
  };
}
