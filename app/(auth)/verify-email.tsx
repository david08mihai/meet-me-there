import { Placeholder } from '../../src/ui/Placeholder';

export default function VerifyEmail() {
  return (
    <Placeholder
      title="Verify Your Email"
      owner="P1 · Auth"
      description="Shown after Register. Should poll firebaseAuth.currentUser.reload() or offer a Resend button (see AuthContext.resendVerificationEmail). Once emailVerified is true, the app redirects to /map automatically."
    />
  );
}
