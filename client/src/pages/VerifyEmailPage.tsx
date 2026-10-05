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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100 transition-colors duration-200 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Email Verification
        </h2>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl py-6 px-4 sm:py-8 sm:px-10 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
          {loading ? (
            <div className="py-8">
              <div className="mx-auto w-10 h-10 rounded-full border-3 border-indigo-500 border-t-transparent animate-spin mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Verifying your email address...</p>
            </div>
          ) : success ? (
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Verified!</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center py-2.5 px-6 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 mb-4">
                <AlertCircle className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Verification Failed</h3>
              <p className="text-sm text-rose-600 dark:text-rose-300 mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
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
