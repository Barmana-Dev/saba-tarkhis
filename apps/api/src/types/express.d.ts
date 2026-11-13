import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        fullName: string;
        mobile: string;
        email: string | null;
        role: Role;
      };
      authSession?: {
        id: string;
        csrfHash: string;
      };
    }
  }
}

export {};
