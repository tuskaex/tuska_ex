import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import { StaggerContainer, StaggerItem } from '../../components/AnimatedSection'
import SectionHeader from '../../components/SectionHeader'
import { educationItems } from '../HomeData'

function Kanji({ char, className = '' }) {
  return <span className={`jp-kanji select-none pointer-events-none ${className}`} aria-hidden="true">{char}</span>
}

export default function EducationSection() {
  return (
    <section className="section-padding bg-dark-800 relative overflow-hidden">
      <div className="absolute inset-0 shoji-bg opacity-20 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Kanji char="教育" className="absolute -left-4 top-1/2 -translate-y-1/2 text-[180px] text-white/[0.02] font-black" />
      </div>
      <div className="section-container relative z-10">
        <SectionHeader
          badge="Education Center"
          title="Education Center"
          highlight="Education Center"
          subtitle="We believe educated traders perform better. Our learning center supports continuous growth at every level."
        />

        {/* Intro banner */}
        <div className="mt-10 mb-10 p-6 rounded-2xl bg-gradient-to-r from-red-accent/10 to-dark-600 border border-red-accent/20 relative overflow-hidden">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 jp-kanji text-[60px] text-red-accent/10 font-black pointer-events-none">学</div>
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div>
              <h3 className="text-white font-bold text-xl mb-2">Start Your Learning Journey</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Whether you are starting your journey or refining advanced strategies, our education hub supports continuous growth with structured courses, live sessions, and expert-curated content.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link to="/education" className="btn-primary gap-2">Explore Education <FiArrowRight size={16} /></Link>
              <Link to="/accounts" className="btn-outline gap-2">Start Demo</Link>
            </div>
          </div>
        </div>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {educationItems.map((item) => (
            <StaggerItem key={item.label}>
              <div className="card jp-card group h-full flex items-start gap-4">
                <div className="text-3xl flex-shrink-0">{item.icon}</div>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-red-light transition-colors">{item.label}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
