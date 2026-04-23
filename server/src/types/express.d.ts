// Augments Express's Request type to include the authenticated user payload

declare namespace Express {
  interface Request {
    user?: {
      id: string;
    };
  }
}
