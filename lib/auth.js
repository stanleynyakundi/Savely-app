import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { sql } from "@/lib/db"; // your database client

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const users = await sql`
          SELECT * FROM users WHERE LOWER(email) = LOWER(${credentials.email})
        `;
        const user = users[0];
        if (!user) return null;

        // Direct string comparison (plain text)
        if (user.password_hash !== credentials.password) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.phone = token.phone;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export { authOptions };
