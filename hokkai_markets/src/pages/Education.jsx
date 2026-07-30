// ============================================
// HOKKAI MARKETS - Education Page
// ============================================

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight, FiBook, FiVideo, FiUsers,
  FiFileText, FiPlay, FiCheck, FiStar, FiClock, FiCalendar
} from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem, PageTransition } from '../components/AnimatedSection'
import SectionHeader from '../components/SectionHeader'
import MarketTicker from '../components/MarketTicker'

const categories = [
  { id: 'all', label: 'All Courses' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'strategy', label: 'Strategy' },
]

const courses = [
  {
    title: 'Introduction to Forex Trading',
    category: 'beginner',
    level: 'Beginner',
    levelColor: 'bg-blue-500/20 text-blue-400',
    duration: '2 hours',
    lessons: 12,
    rating: 4.9,
    type: 'Video Course',
    icon: <FiVideo size={16} />,
    topics: ['What is Forex?', 'Currency pairs explained', 'How to read charts', 'Basic order types'],
  },
  {
    title: 'Technical Analysis Fundamentals',
    category: 'beginner',
    level: 'Beginner',
    levelColor: 'bg-blue-500/20 text-blue-400',
    duration: '3 hours',
    lessons: 18,
    rating: 4.8,
    type: 'Video Course',
    icon: <FiVideo size={16} />,
    topics: ['Chart patterns', 'Support & resistance', 'Trend lines', 'Moving averages'],
  },
  {
    title: 'Risk Management Mastery',
    category: 'intermediate',
    level: 'Intermediate',
    levelColor: 'bg-red-accent/20 text-red-accent',
    duration: '2.5 hours',
    lessons: 15,
    rating: 4.9,
    type: 'Video Course',
    icon: <FiVideo size={16} />,
    topics: ['Position sizing', 'Stop-loss strategies', 'Risk/reward ratios', 'Portfolio management'],
  },
  {
    title: 'Advanced Trading Strategies',
    category: 'advanced',
    level: 'Advanced',
    levelColor: 'bg-purple-500/20 text-purple-400',
    duration: '4 hours',
    lessons: 24,
    rating: 4.7,
    type: 'Video Course',
    icon: <FiVideo size={16} />,
    topics: ['Scalping techniques', 'Swing trading', 'Price action', 'Multi-timeframe analysis'],
  },
  {
    title: 'Forex Trading for Beginners',
    category: 'beginner',
    level: 'Beginner',
    levelColor: 'bg-blue-500/20 text-blue-400',
    duration: '45 pages',
    lessons: 8,
    rating: 4.8,
    type: 'E-Book',
    icon: <FiBook size={16} />,
    topics: ['Market basics', 'Trading psychology', 'Platform guide', 'First trade walkthrough'],
  },
  {
    title: 'Candlestick Pattern Bible',
    category: 'intermediate',
    level: 'Intermediate',
    levelColor: 'bg-red-accent/20 text-red-accent',
    duration: '60 pages',
    lessons: 10,
    rating: 4.9,
    type: 'E-Book',
    icon: <FiBook size={16} />,
    topics: ['All major patterns', 'Pattern reliability', 'Entry signals', 'Real examples'],
  },
  {
    title: 'Algorithmic Trading Basics',
    category: 'advanced',
    level: 'Advanced',
    levelColor: 'bg-purple-500/20 text-purple-400',
    duration: '5 hours',
    lessons: 30,
    rating: 4.6,
    type: 'Video Course',
    icon: <FiVideo size={16} />,
    topics: ['EA development', 'Backtesting', 'Optimization', 'Live deployment'],
  },
  {
    title: 'Trading Psychology & Discipline',
    category: 'strategy',
    level: 'All Levels',
    levelColor: 'bg-green-accent/20 text-green-accent',
    duration: '2 hours',
    lessons: 14,
    rating: 5.0,
    type: 'Video Course',
    icon: <FiVideo size={16} />,
    topics: ['Emotional control', 'Trading journal', 'Discipline habits', 'Mindset mastery'],
  },
]

const upcomingWebinars = [
  {
    title: 'Live Market Analysis: EUR/USD Outlook',
    date: 'Monday, 10:00 AM GMT',
    host: 'Senior Market Analyst',
    spots: 47,
    type: 'Free',
  },
  {
    title: 'Mastering Price Action Trading',
    date: 'Wednesday, 2:00 PM GMT',
    host: 'Professional Trader',
    spots: 23,
    type: 'Free',
  },
  {
    title: 'Gold & Commodities: Trading Strategies',
    date: 'Friday, 11:00 AM GMT',
    host: 'Commodities Specialist',
    spots: 61,
    type: 'Free',
  },
]

function Education() {
  const [activeCategory, setActiveCategory] = useState('all')

  const filteredCourses = activeCategory === 'all'
    ? courses
    : courses.filter(c => c.category === activeCategory)

  return (
    <PageTransition>
      <div className="pt-16 md:pt-18">
        <MarketTicker />
      </div>

      {/* Hero */}
      <section className="relative py-20 hero-bg grid-bg overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        <div className="section-container relative z-10">
          <AnimatedSection animation="slideUp" className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-accent/10 border border-red-accent/20 mb-6">
              <FiBook size={14} className="text-red-accent" />
              <span className="text-red-accent text-xs font-semibold uppercase tracking-wider">Education Center</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Learn to Trade with <span className="text-red-gradient">Confidence</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              From beginner guides to advanced strategies — our comprehensive education center has everything you need to become a successful trader.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Start Learning <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-outline gap-2">
                Open Demo Account
              </Link>
            </div>
          </AnimatedSection>

          {/* Stats */}
          <AnimatedSection animation="slideUp" delay={0.3} className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 max-w-2xl mx-auto">
            {[
              { value: '50+', label: 'Video Courses' },
              { value: '20+', label: 'E-Books & PDFs' },
              { value: 'Weekly', label: 'Live Webinars' },
              { value: 'Free', label: 'All Resources' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-dark-600/50 border border-white/5">
                <div className="text-2xl font-bold text-red-gradient mb-1">{stat.value}</div>
                <div className="text-gray-400 text-xs">{stat.label}</div>
              </div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* Courses */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Courses"
            title="Trading Courses & Guides"
            highlight="Trading Courses"
            subtitle="Structured learning paths for every experience level."
          />

          {/* Category Filter */}
          <AnimatedSection animation="slideUp" delay={0.2} className="flex flex-wrap justify-center gap-2 mt-10 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeCategory === cat.id
                    ? 'bg-red-accent text-white shadow-lg shadow-red-accent/20'
                    : 'bg-dark-600 text-gray-400 border border-white/5 hover:border-red-accent/20 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCourses.map((course) => (
              <StaggerItem key={course.title}>
                <div className="card group h-full flex flex-col hover:border-red-accent/30">
                  {/* Empty image container */}
                  <div className="rounded-xl bg-dark-500/50 border border-white/5 aspect-video w-full mb-4">
                    {/* Intentionally empty image container */}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className={`badge text-xs ${course.levelColor}`}>{course.level}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FiStar size={11} style={{ color: '#e63946', fill: '#e63946' }} />
                      {course.rating}
                    </div>
                  </div>

                  <h3 className="text-white font-semibold text-sm mb-2 group-hover:text-red-light transition-colors flex-1">
                    {course.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      {course.icon}
                      {course.type}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiClock size={11} />
                      {course.duration}
                    </span>
                  </div>

                  <ul className="space-y-1 mb-4">
                    {course.topics.slice(0, 3).map((t) => (
                      <li key={t} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="w-1 h-1 rounded-full bg-red-accent flex-shrink-0"></div>
                        {t}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/accounts"
                    className="mt-auto flex items-center gap-1.5 text-red-accent text-xs font-semibold hover:text-red-light transition-colors"
                  >
                    <FiPlay size={12} />
                    Start Course
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Webinars */}
      <section className="section-padding bg-dark-800">
        <div className="section-container">
          <SectionHeader
            badge="Live Webinars"
            title="Weekly Live Webinars"
            highlight="Live Webinars"
            subtitle="Join our expert analysts for live market analysis and trading strategy sessions every week."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            {upcomingWebinars.map((webinar, i) => (
              <AnimatedSection key={webinar.title} animation="slideUp" delay={i * 0.1}>
                <div className="card group hover:border-red-accent/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="badge bg-green-accent/20 text-green-accent text-xs">
                      {webinar.type}
                    </span>
                    <span className="text-xs text-gray-500">{webinar.spots} spots left</span>
                  </div>

                  {/* Empty image container */}
                  <div className="rounded-xl bg-dark-500/50 border border-white/5 aspect-video w-full mb-4">
                    {/* Intentionally empty image container */}
                  </div>

                  <h3 className="text-white font-semibold text-sm mb-2 group-hover:text-red-light transition-colors">
                    {webinar.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <FiCalendar size={11} className="text-red-accent" />
                    {webinar.date}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                    <FiUsers size={11} className="text-red-accent" />
                    {webinar.host}
                  </div>

                  <Link
                    to="/accounts"
                    className="flex items-center gap-1.5 text-red-accent text-xs font-semibold hover:text-red-light transition-colors"
                  >
                    Register Free <FiArrowRight size={12} />
                  </Link>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Path */}
      <section className="section-padding bg-dark-900">
        <div className="section-container">
          <SectionHeader
            badge="Learning Path"
            title="Your Trading Journey"
            highlight="Trading Journey"
            subtitle="Follow our structured learning path from complete beginner to professional trader."
          />

          <div className="max-w-3xl mx-auto mt-14 space-y-4">
            {[
              { phase: 'Phase 1', title: 'Foundation', desc: 'Learn the basics of financial markets, trading terminology, and how to use the platform.', items: ['Market basics', 'Platform walkthrough', 'Order types', 'Basic charting'], color: 'border-blue-400/30 bg-blue-400/5' },
              { phase: 'Phase 2', title: 'Technical Skills', desc: 'Master technical analysis, chart patterns, and key indicators used by professional traders.', items: ['Technical analysis', 'Chart patterns', 'Key indicators', 'Multi-timeframe'], color: 'border-red-accent/30 bg-red-accent/5' },
              { phase: 'Phase 3', title: 'Strategy Development', desc: 'Build and test your own trading strategies with proper risk management rules.', items: ['Strategy building', 'Backtesting', 'Risk management', 'Trade journaling'], color: 'border-purple-400/30 bg-purple-400/5' },
              { phase: 'Phase 4', title: 'Live Trading', desc: 'Apply your skills in live markets with real capital and continuous improvement.', items: ['Live execution', 'Psychology mastery', 'Performance review', 'Scaling up'], color: 'border-green-accent/30 bg-green-accent/5' },
            ].map((phase, i) => (
              <AnimatedSection key={phase.phase} animation="slideUp" delay={i * 0.1}>
                <div className={`rounded-2xl border p-6 ${phase.color}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-dark-600 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-accent font-bold text-sm">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">{phase.phase}</span>
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">{phase.title}</h3>
                      <p className="text-gray-400 text-sm mb-3">{phase.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {phase.items.map((item) => (
                          <span key={item} className="flex items-center gap-1 text-xs text-gray-400 bg-dark-600/50 px-2 py-1 rounded-lg">
                            <FiCheck size={10} className="text-red-accent" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-dark-800">
        <div className="section-container text-center">
          <AnimatedSection animation="slideUp">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Start Your <span className="text-red-gradient">Trading Education</span> Today
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              All educational resources are completely free for Hokkai Markets account holders.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/accounts" className="btn-primary gap-2">
                Open Free Account <FiArrowRight size={16} />
              </Link>
              <Link to="/accounts" className="btn-secondary gap-2">
                Browse All Courses
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageTransition>
  )
}

export default Education
