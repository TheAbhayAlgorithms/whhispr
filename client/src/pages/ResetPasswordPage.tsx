import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { MessageSquare, Lock, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing reset token. Please request a new password reset link.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
        skipAuth: true,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
          Choose a new password
        </h2>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full">
        <div className="bg-white dark:bg-[#141515] py-6 px-4 sm:py-8 sm:px-10 shadow-xl rounded-3xl border border-[#E5E5E3] dark:border-[#2C2E2E]">
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-[#191A1A] dark:text-[#EDEDED] mb-2">Password Reset Successful</h3>
              <p className="text-sm text-[#737878] dark:text-[#9EA3A3] mb-6">
                Your password has been securely updated. Redirecting to login...
              </p>
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-semibold text-[#20B2AA] hover:text-[#1CA099]"
              >
                Go to Sign In immediately
              </Link>
            </div>
          ) : (
            <>
              {(!token || error) && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-600 dark:text-rose-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                  <span>
                    {!token
                      ? 'No reset token found in URL. Please use the exact link sent to your email.'
                      : error}
                  </span>
                </div>
              )}

              <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#737878] dark:text-[#9EA3A3]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, Aa1!"
                      className="block w-full pl-10 pr-3 py-2.5 bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] text-base sm:text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#737878] dark:text-[#9EA3A3] mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#737878] dark:text-[#9EA3A3]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="block w-full pl-10 pr-3 py-2.5 bg-[#F9F9F8] dark:bg-[#191A1A] border border-[#E5E5E3] dark:border-[#2D3030] rounded-xl text-[#191A1A] dark:text-[#EDEDED] placeholder-[#737878] dark:placeholder-[#9EA3A3] focus:outline-none focus:border-[#20B2AA] focus:ring-1 focus:ring-[#20B2AA] text-base sm:text-sm transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-black bg-[#20B2AA] hover:bg-[#1CA099] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#20B2AA] disabled:opacity-50 shadow-md shadow-[#20B2AA]/20 transition duration-150 cursor-pointer active:scale-95"
                >
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  ) : (
                    'Update Password'
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-xs font-medium text-[#737878] dark:text-[#9EA3A3] hover:text-[#191A1A] dark:hover:text-[#EDEDED] transition"
                  >
                    <ArrowLeft className="mr-1 w-3.5 h-3.5" />
                    Back to sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
