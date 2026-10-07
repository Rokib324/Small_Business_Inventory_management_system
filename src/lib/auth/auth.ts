import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";

export const loginSchema = z.object({
  identifier: z.string().min(1, "মোবাইল নম্বর অথবা ইমেইল দিন"),
  password: z.string().min(6, "পাসওয়ার্ড দিন"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Identifier", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { identifier, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { phone: identifier },
              { email: identifier.toLowerCase() },
            ],
            deletedAt: null,
            isActive: true,
          },
          include: {
            shop: true,
          },
        });

        if (!user || !user.passwordHash || !user.shop) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          shopId: user.shopId,
          shopName: user.shop.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.shopId = (user as unknown as { shopId: string }).shopId;
        token.shopName = (user as unknown as { shopName: string }).shopName;
        token.role = (user as unknown as { role: Role }).role;
        token.phone = (user as unknown as { phone?: string | null }).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.shopId = token.shopId as string;
        session.user.shopName = token.shopName as string;
        session.user.role = token.role as Role;
        session.user.phone = token.phone as string | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
});
