import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GithubProvider from 'next-auth/providers/github';

// export const authOptions = {
//     providers: [
//         EmailProvider({
//             server: {
//                 host: process.env.EMAIL_SERVER_HOST,
//                 port: Number(process.env.EMAIL_SERVER_PORT),
//                 auth: {
//                     user: process.env.EMAIL_SERVER_USER,
//                     pass: process.env.EMAIL_SERVER_PASSWORD,
//                 },
//             },
//             from: process.env.EMAIL_FROM,
//         }),
//         GithubProvider({
//             clientId: process.env.GITHUB_CLIENT_ID,
//             clientSecret: process.env.GITHUB_CLIENT_SECRET,
//         }),
//     ],
//     adapter: {}
//     pages: {
//         signIn: '/',
//         signOut: '/',
//         error: '/',
//         verifyRequest: '/',
//     },
// };

// Call and export as default NextAuth to automatically create & handle the API routes for authentication
// export default NextAuth(authOptions);