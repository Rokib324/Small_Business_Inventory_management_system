import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      shopId: string;
      shopName: string;
      role: Role;
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    shopId: string;
    shopName: string;
    role: Role;
    phone?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    shopId: string;
    shopName: string;
    role: Role;
    phone?: string | null;
  }
}
