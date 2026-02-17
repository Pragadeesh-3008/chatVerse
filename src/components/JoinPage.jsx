import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useUser
} from '@clerk/clerk-react'

function JoinPage() {
  const { isSignedIn, user } = useUser()
  const navigate = useNavigate()

  // Auto-redirect if already signed in
  useEffect(() => {
    if (isSignedIn) {
      navigate('/chat')
    }
  }, [isSignedIn, navigate])

  return (
    <div className="relative flex justify-center items-center h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] animate-gradient overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-8 items-center w-[90%] sm:w-[450px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl px-8 py-10 rounded-2xl animate-fade-in">
        {/* Logo / Brand */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            💬 ChatVerse
          </h1>
          <p className="mt-2 text-sm text-gray-400">Connect. Chat. Collaborate.</p>
        </div>

        <SignedOut>
          <div className="flex flex-col gap-4 w-full">
            <p className="text-center text-gray-300 text-sm mb-2">Sign in to start chatting with the world</p>

            <SignInButton mode="modal">
              <button className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all duration-200">
                Sign In
              </button>
            </SignInButton>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <SignUpButton mode="modal">
              <button className="w-full py-3 rounded-xl font-semibold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200">
                Create Account
              </button>
            </SignUpButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-indigo-500 p-1">
                <img src={user?.imageUrl} alt="profile" className="w-full h-full rounded-full object-cover" />
              </div>
            </div>
            <p className="text-white font-medium">Welcome back, {user?.firstName}!</p>
            <button
              onClick={() => navigate('/chat')}
              className="w-full px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all duration-200"
            >
              Go to Chat
            </button>
          </div>
        </SignedIn>

        <p className="text-xs text-gray-500">Secure authentication powered by Clerk</p>
      </div>
    </div>
  )
}

export default JoinPage