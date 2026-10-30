import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Footer } from './components/common/Footer';
import { DemoSwitcherBanner } from './components/common/DemoSwitcherBanner';
import { HeroSection } from './components/home/HeroSection';
import { CategorySection } from './components/home/CategorySection';
import { BenefitsSection } from './components/home/BenefitsSection';
import { TeacherIntroSection } from './components/home/TeacherIntroSection';
import { PricingSection } from './components/home/PricingSection';
import { CourseCatalog } from './components/courses/CourseCatalog';
import { CourseDetailModal } from './components/courses/CourseDetailModal';
import { LessonPlayer } from './components/lesson/LessonPlayer';
import { PracticeCenter } from './components/practice/PracticeCenter';
import { AiTutorPreview } from './components/aitutor/AiTutorPreview';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/auth/ProfileModal';
import { SupabaseConfigModal } from './components/auth/SupabaseConfigModal';
import { Course, Lesson } from './types';
import { DbCourse, DbLesson } from './services/courseService';

function MainApp() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<DbCourse | Course | null>(null);

  // Active playing lesson state
  const [playingState, setPlayingState] = useState<{
    course: DbCourse | Course;
    lesson: DbLesson | Lesson;
  } | null>(null);

  const handleStartFree = () => {
    if (user) {
      setActiveTab('dashboard');
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleSelectLesson = (course: DbCourse | Course, lesson: DbLesson | Lesson) => {
    setSelectedCourseForModal(null);
    setPlayingState({ course, lesson });
  };

  // If a lesson is being played, render the full-screen LessonPlayer
  if (playingState) {
    return (
      <div className="min-h-screen bg-slate-950">
        <DemoSwitcherBanner
          onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setPlayingState(null);
            setActiveTab(tab);
          }}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
        <LessonPlayer
          course={playingState.course}
          lesson={playingState.lesson}
          onBack={() => setPlayingState(null)}
        />
        <SupabaseConfigModal
          isOpen={isSupabaseConfigOpen}
          onClose={() => setIsSupabaseConfigOpen(false)}
        />
      </div>
    );
  }

  // Determine whether sidebar is visible:
  // When user is authenticated AND on internal tabs (dashboard, practice, aitutor, teacher)
  const showSidebar =
    Boolean(user) &&
    (activeTab === 'dashboard' ||
      activeTab === 'practice' ||
      activeTab === 'aitutor' ||
      activeTab === 'teacher');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Demo & DB Switcher Banner */}
      <DemoSwitcherBanner
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Strict 3-zone Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <div className="flex-1 flex">
        {/* Collapsible Sidebar for Authenticated Views */}
        {showSidebar && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenPricing={() => setActiveTab('pricing')}
          />
        )}

        {/* Main Content Viewport */}
        <main
          className={`flex-1 transition-all duration-300 ${
            showSidebar ? (isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64') : ''
          }`}
        >
          {/* TAB: HOME */}
          {activeTab === 'home' && (
            <div>
              <HeroSection
                onStartFree={handleStartFree}
                onExploreCourses={() => setActiveTab('courses')}
              />
              <CategorySection
                onSelectCourse={(course) => setSelectedCourseForModal(course)}
                onOpenPricing={() => setActiveTab('pricing')}
              />
              <BenefitsSection />
              <TeacherIntroSection />
              <PricingSection onStartFree={handleStartFree} />
              <Footer
                setActiveTab={setActiveTab}
                onOpenPricing={() => setActiveTab('pricing')}
                onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
              />
            </div>
          )}

          {/* TAB: COURSES */}
          {activeTab === 'courses' && (
            <div>
              <CourseCatalog
                onSelectCourse={(course) => setSelectedCourseForModal(course)}
                onOpenPricing={() => setActiveTab('pricing')}
              />
              <Footer
                setActiveTab={setActiveTab}
                onOpenPricing={() => setActiveTab('pricing')}
                onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
              />
            </div>
          )}

          {/* TAB: STUDENT DASHBOARD */}
          {activeTab === 'dashboard' && (
            <StudentDashboard
              onSelectCourse={(course) => setSelectedCourseForModal(course)}
              onSelectLesson={handleSelectLesson}
              onOpenPricing={() => setActiveTab('pricing')}
              onExploreCourses={() => setActiveTab('courses')}
            />
          )}

          {/* TAB: PRACTICE LAB */}
          {activeTab === 'practice' && <PracticeCenter />}

          {/* TAB: AI TUTOR (PREVIEW) */}
          {activeTab === 'aitutor' && <AiTutorPreview />}

          {/* TAB: TEACHER STUDIO */}
          {activeTab === 'teacher' && <TeacherDashboard />}

          {/* TAB: PRICING / MEMBERSHIP */}
          {activeTab === 'pricing' && (
            <div>
              <PricingSection onStartFree={handleStartFree} />
              <Footer
                setActiveTab={setActiveTab}
                onOpenPricing={() => setActiveTab('pricing')}
                onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
              />
            </div>
          )}
        </main>
      </div>

      {/* Course Detail Modal */}
      <CourseDetailModal
        course={selectedCourseForModal}
        onClose={() => setSelectedCourseForModal(null)}
        onSelectLesson={handleSelectLesson}
        onOpenPricing={() => {
          setSelectedCourseForModal(null);
          setActiveTab('pricing');
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(role) => {
          setIsAuthOpen(false);
          if (role === 'teacher') {
            setActiveTab('teacher');
          } else {
            setActiveTab('dashboard');
          }
        }}
      />

      {/* Profile Management Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenPricing={() => setActiveTab('pricing')}
      />

      {/* Supabase Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
        onOpenAuthModal={() => {
          setIsSupabaseConfigOpen(false);
          setIsAuthOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}
