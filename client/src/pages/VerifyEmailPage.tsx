import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { MessageSquare, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setSuccess(false);
      setMessage('No verification token provided in URL.');
      return;
    }

    const verify = async () => {
      try {
        const res = await apiRequest<{ message: string }>(`/api/v1/auth/verify-email/${token}`, {
          method: 'GET',
          skipAuth: true,
        });
        setSuccess(true);
        setMessage(res.message || 'Email verified successfully!');
      } catch (err: unknown) {
        setSuccess(false);
        setMessage(err instanceof Error ? err.message : 'Email verification failed.');
      } finally {
        setLoading(false);
      }
    };

    void verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F9F9F8] dark:bg-[#191A1A] text-[#191A1A] dark:text-[#EDEDED] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#20B2AA] flex items-center justify-center shadow-lg shadow-[#20B2AA]/20 font-bold text-black">
            <MessageSquare className="w-6 h-6 text-black" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191A1A] dark:text-[#EDEDED]">
          Email Verification
        </h2>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="bg-white dark:bg-[#141515] py-6 px-4 sm:py-8 sm:px-10 shadow-xl rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E] text-center">
          {loading ? (
            <div className="py-8">
              <div className="mx-auto w-10 h-10 rounded-full border-3 border-[#20B2AA] border-t-transparent animate-spin mb-4" />
              <p className="text-sm text-[#737878] dark:text-[#9EA3A3]">Verifying your email address...</p>
            </div>
          ) : success ? (
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-[#191A1A] dark:text-[#EDEDED] mb-2">Verified!</h3>
              <p className="text-sm text-[#737878] dark:text-[#9EA3A3] mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center py-2.5 px-6 rounded-xl text-sm font-semibold text-black bg-[#20B2AA] hover:bg-[#1CA099] shadow-md shadow-[#20B2AA]/20 transition cursor-pointer active:scale-95"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="ml-2 w-4 h-4 text-black" />
              </Link>
            </div>
          ) : (
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 mb-4">
                <AlertCircle className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-[#191A1A] dark:text-[#EDEDED] mb-2">Verification Failed</h3>
              <p className="text-sm text-rose-600 dark:text-rose-400 mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-semibold text-[#20B2AA] hover:text-[#1CA099]"
              >
                Return to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
