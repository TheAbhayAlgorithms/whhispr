import { TokenUserPayload } from '../services/token.service';

declare global {
  namespace Express {
    interface Request {
      user?: TokenUserPayload;
    }
  }
}
