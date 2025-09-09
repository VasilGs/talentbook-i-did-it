import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Heart, X, Sparkles, User, Building2, LogOut, Bookmark, Crown, Loader2 } from 'lucide-react'
import { JobCard } from './components/JobCard'
import { JobDetailsModal } from './components/JobDetailsModal'
import { LoginModal } from './components/login-modal'
import { SignupModal } from './components/signup-modal'
import { PrivacyTermsModal } from './components/PrivacyTermsModal'
import { JobCandidateAnimation } from './components/job-candidate-animation'
import { Pricing } from './components/ui/pricing'
import { AddOnsModal } from './components/AddOnsModal'
import { supabase, type User as SupabaseUser } from './lib/supabase'

// Lazy load heavy components
const UserProfileView = lazy(() => import('./components/UserProfileView').then(module => ({ default: module.UserProfileView })))
const CompanyProfileView = lazy(() => import('./components/CompanyProfileView').then(module => ({ default: module.CompanyProfileView })))
const JobSeekerProfileCompletion = lazy(() => import('./components/JobSeekerProfileCompletion').then(module => ({ default: module.JobSeekerProfileCompletion })))
const CompanyProfileCompletion = lazy(() => import('./components/CompanyProfileCompletion').then(module => ({ default: module.CompanyProfileCompletion })))
const CheckoutSuccess = lazy(() => import('./components/CheckoutSuccess').then(module => ({ default: module.CheckoutSuccess })))
const CheckoutCancel = lazy(() => import('./components/CheckoutCancel').then(module => ({ default: module.CheckoutCancel })))

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-[#FFC107] to-[#FFB300] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Loading...</h2>
      <p className="text-gray-300">Please wait while we prepare your content</p>
    </div>
  </div>
)

// Mock job data
const mockJobs = [
  {
    id: 1,
    company: "TechCorp",
    position: "Senior Software Engineer",
    location: "San Francisco, CA",
    salary: "$120,000 - $180,000",
    logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2"
  },
  {
    id: 2,
    company: "DataFlow Inc",
    position: "Data Scientist",
    location: "New York, NY",
    salary: "$100,000 - $150,000",
    logo: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2"
  },
  {
    id: 3,
    company: "DesignStudio",
    position: "UX/UI Designer",
    location: "Remote",
    salary: "$80,000 - $120,000",
    logo: "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2"
  },
  {
    id: 4,
    company: "CloudTech",
    position: "DevOps Engineer",
    location: "Seattle, WA",
    salary: "$110,000 - $160,000",
    logo: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2"
  },
  {
    id: 5,
    company: "StartupXYZ",
    position: "Product Manager",
    location: "Austin, TX",
    salary: "$90,000 - $140,000",
    logo: "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2"
  }
]

interface SignupData {
  name: string
  email: string
  password: string
  userType: 'job_seeker' | 'company'
}

interface CompanyData {
  id: string
  company_name: string
  company_logo: string | null
  industry: string | null
  website_link: string | null
  short_introduction: string | null
  mol_name: string | null
  uic_company_id: string | null
  address: string | null
  phone_number: string | null
  contact_email: string | null
  responsible_person_name: string | null
  number_of_employees: number | null
  subscription_package: string | null
  created_at: string
  updated_at: string
  user_id: string | null
}

function App() {
  const [currentJobIndex, setCurrentJobIndex] = useState(0)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showPrivacyTermsModal, setShowPrivacyTermsModal] = useState(false)
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [companyProfile, setCompanyProfile] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingSignupData, setPendingSignupData] = useState<SignupData | null>(null)

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await fetchUserProfile(session.user.id)
        
        // Close modals when user signs in
        setShowLoginModal(false)
        setShowSignupModal(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserProfile(null)
        setCompanyProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error checking auth status:', error)
      } else if (session?.user) {
        setUser(session.user)
        await fetchUserProfile(session.user.id)
      }
    } catch (error) {
      console.error('Error in checkAuthStatus:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (userId: string) => {
    try {
      // First check if user has a job seeker profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
      } else if (profile) {
        setUserProfile(profile)
        return
      }

      // If no job seeker profile, check for company profile
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (companyError) {
        console.error('Error fetching company profile:', companyError)
      } else if (company) {
        setCompanyProfile(company)
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    }
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    setExitDirection(direction)
    
    setTimeout(() => {
      if (direction === 'right') {
        console.log('Liked job:', mockJobs[currentJobIndex])
      } else {
        console.log('Passed on job:', mockJobs[currentJobIndex])
      }
      
      setCurrentJobIndex((prev) => (prev + 1) % mockJobs.length)
      setExitDirection(null)
    }, 400)
  }

  const handleCardClick = (job: any) => {
    setSelectedJob(job)
    setShowJobDetails(true)
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserProfile(null)
      setCompanyProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleContinueSignup = (signupData: SignupData) => {
    setPendingSignupData(signupData)
  }

  const handleProfileComplete = () => {
    setPendingSignupData(null)
    // Refresh user data
    if (user) {
      fetchUserProfile(user.id)
    }
  }

  const handleCompanyUpdateSuccess = () => {
    if (user) {
      fetchUserProfile(user.id)
    }
  }

  // Show loading screen while checking auth
  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Checkout Routes */}
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
            
            {/* Profile Completion Routes */}
            {pendingSignupData && (
              <>
                {pendingSignupData.userType === 'job_seeker' ? (
                  <Route 
                    path="/complete-profile" 
                    element={
                      <JobSeekerProfileCompletion 
                        signupData={pendingSignupData}
                        onProfileComplete={handleProfileComplete}
                      />
                    } 
                  />
                ) : (
                  <Route 
                    path="/complete-profile" 
                    element={
                      <CompanyProfileCompletion 
                        signupData={pendingSignupData}
                        onProfileComplete={handleProfileComplete}
                      />
                    } 
                  />
                )}
              </>
            )}

            {/* Main App Route */}
            <Route path="/" element={
              <>
                {/* Navigation Header */}
                <nav className="relative z-50 p-6">
                  <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden">
                        <img 
                          src="/talent book singular icon.png" 
                          alt="TalentBook" 
                          className="w-full h-full object-contain"
                          loading="eager"
                        />
                      </div>
                      <div className="text-white">
                        <h1 className="text-xl font-bold font-poppins">TalentBook</h1>
                        <p className="text-xs text-gray-400">Find your perfect match</p>
                      </div>
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex items-center space-x-4">
                      {user ? (
                        <div className="flex items-center space-x-4">
                          {/* User Profile Button */}
                          <button
                            onClick={() => {
                              if (userProfile) {
                                // Navigate to user profile view
                                window.location.href = '/profile'
                              } else if (companyProfile) {
                                // Navigate to company profile view
                                window.location.href = '/company'
                              }
                            }}
                            className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20 transition-all duration-200"
                          >
                            {userProfile ? (
                              <>
                                <User className="w-5 h-5 text-[#FFC107]" />
                                <span className="text-white font-medium">My Profile</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-5 h-5 text-[#FFC107]" />
                                <span className="text-white font-medium">Company</span>
                              </>
                            )}
                          </button>

                          {/* Sign Out Button */}
                          <button
                            onClick={handleSignOut}
                            className="flex items-center space-x-2 bg-red-600/20 hover:bg-red-600/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-red-600/40 transition-all duration-200"
                          >
                            <LogOut className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 font-medium">Sign Out</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowLoginModal(true)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 border border-white/20"
                          >
                            Log In
                          </button>
                          <button
                            onClick={() => setShowSignupModal(true)}
                            className="bg-[#FFC107] hover:bg-[#FFB300] text-black px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-[#FFC107]/25"
                          >
                            Sign Up Free
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </nav>

                {/* Hero Section */}
                <div className="relative min-h-screen flex items-center justify-center px-6">
                  {/* Background Elements */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-600/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FFC107]/10 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-white/5 rounded-full blur-3xl"></div>
                  </div>

                  <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left Side - Content */}
                    <div className="text-center lg:text-left space-y-8">
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      >
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight font-poppins">
                          <JobCandidateAnimation />
                        </h1>
                        <p className="text-xl text-gray-300 mt-6 leading-relaxed">
                          The modern way to connect talent with opportunity. 
                          Swipe through jobs like never before.
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                      >
                        {!user && (
                          <>
                            <button
                              onClick={() => setShowSignupModal(true)}
                              className="bg-[#FFC107] hover:bg-[#FFB300] text-black px-8 py-4 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-[#FFC107]/25 text-lg"
                            >
                              Get Started Free
                            </button>
                            <button
                              onClick={() => setShowLoginModal(true)}
                              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-lg font-medium transition-all duration-200 border border-white/20 text-lg"
                            >
                              Sign In
                            </button>
                          </>
                        )}
                      </motion.div>

                      {/* Features */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12"
                      >
                        <div className="text-center lg:text-left">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center mx-auto lg:mx-0 mb-3">
                            <Heart className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-white font-semibold mb-2">Smart Matching</h3>
                          <p className="text-gray-400 text-sm">AI-powered job matching based on your skills and preferences</p>
                        </div>
                        <div className="text-center lg:text-left">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#FFC107] to-[#FFB300] rounded-xl flex items-center justify-center mx-auto lg:mx-0 mb-3">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-white font-semibold mb-2">Instant Connect</h3>
                          <p className="text-gray-400 text-sm">Connect with employers and candidates in real-time</p>
                        </div>
                        <div className="text-center lg:text-left">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto lg:mx-0 mb-3">
                            <Crown className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-white font-semibold mb-2">Premium Features</h3>
                          <p className="text-gray-400 text-sm">Advanced tools for serious job seekers and recruiters</p>
                        </div>
                      </motion.div>
                    </div>

                    {/* Right Side - Job Card */}
                    <div className="flex justify-center lg:justify-end">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        className="relative"
                      >
                        <AnimatePresence mode="wait">
                          <JobCard
                            key={currentJobIndex}
                            job={mockJobs[currentJobIndex]}
                            onSwipe={handleSwipe}
                            onCardClick={handleCardClick}
                            exitDirection={exitDirection}
                          />
                        </AnimatePresence>

                        {/* Swipe Instructions */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                          className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex items-center space-x-8"
                        >
                          <div className="flex items-center space-x-2 text-gray-400">
                            <div className="w-8 h-8 bg-red-600/20 border border-red-600/40 rounded-full flex items-center justify-center">
                              <X className="w-4 h-4 text-red-400" />
                            </div>
                            <span className="text-sm">Swipe left to pass</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-400">
                            <div className="w-8 h-8 bg-green-600/20 border border-green-600/40 rounded-full flex items-center justify-center">
                              <Heart className="w-4 h-4 text-green-400" />
                            </div>
                            <span className="text-sm">Swipe right to like</span>
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="relative z-10">
                  <Pricing 
                    user={user}
                    openSignup={() => setShowSignupModal(true)}
                    onViewAddOns={() => setShowAddOnsModal(true)}
                  />
                </div>

                {/* Modals */}
                <JobDetailsModal
                  isOpen={showJobDetails}
                  onClose={() => setShowJobDetails(false)}
                  job={selectedJob}
                  userId={user?.id || null}
                />

                <LoginModal
                  isOpen={showLoginModal}
                  onClose={() => setShowLoginModal(false)}
                  onSwitchToSignup={() => {
                    setShowLoginModal(false)
                    setShowSignupModal(true)
                  }}
                />

                <SignupModal
                  isOpen={showSignupModal}
                  onClose={() => setShowSignupModal(false)}
                  onSwitchToLogin={() => {
                    setShowSignupModal(false)
                    setShowLoginModal(true)
                  }}
                  onContinueSignup={handleContinueSignup}
                  onOpenPrivacyTerms={() => setShowPrivacyTermsModal(true)}
                />

                <PrivacyTermsModal
                  isOpen={showPrivacyTermsModal}
                  onClose={() => setShowPrivacyTermsModal(false)}
                />

                {user && (
                  <AddOnsModal
                    isOpen={showAddOnsModal}
                    onClose={() => setShowAddOnsModal(false)}
                  />
                )}
              </>
            } />

            {/* Profile Routes */}
            <Route path="/profile" element={
              user && userProfile ? (
                <UserProfileView onSignOut={handleSignOut} />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            <Route path="/company" element={
              user && companyProfile ? (
                <CompanyProfileView 
                  company={companyProfile}
                  onUpdateSuccess={handleCompanyUpdateSuccess}
                  onSignOut={handleSignOut}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            {/* Profile Completion Route */}
            <Route path="/complete-profile" element={
              pendingSignupData ? (
                pendingSignupData.userType === 'job_seeker' ? (
                  <JobSeekerProfileCompletion 
                    signupData={pendingSignupData}
                    onProfileComplete={handleProfileComplete}
                  />
                ) : (
                  <CompanyProfileCompletion 
                    signupData={pendingSignupData}
                    onProfileComplete={handleProfileComplete}
                  />
                )
              ) : (
                <Navigate to="/" replace />
              )
            } />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  )
}

export default App