import React from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import AnimatedSection, { StaggerContainer, StaggerItem } from '../../components/AnimatedSection'
import SectionHeader from '../../components/SectionHeader'
import { toolsResearch } from '../HomeData'

function Kanji({ char, className = '' }) {
  return <span className={`jp-kanji select-none pointer-events-none ${className}`} aria-hidden="true">{char}</span>
}

export default function ToolsSection() {
  return (
    <section className="section-padding bg-dark-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Kanji char="道具" className="absolute -right-4 top-1/2 -translate-y-1/2 text-[180px] text-white/[0.02] font-black" />
      </div>
      <div className="section-container relative z-10">
        <SectionHeader
          badge="Tools & Research"
          title="Professional Tools & Research"
          highlight="Tools & Research"
          subtitle="Hokkai Markets provides professional research and analytical tools to support informed trading decisions."
        />
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
          {toolsResearch.map((tool) => (
            <StaggerItem key={tool.label}>
              <div className="card jp-card group h-full flex flex-col">
                <div className="text-3xl mb-3">{tool.icon}</div>
                <h3 className="text-white font-semibold text-sm mb-2 group-hover:text-red-light transition-colors">{tool.label}</h3>
                <p className="text-gray-500 text-xs leading-relaxed flex-1">{tool.desc}</p>
              </div>
            </StaggerItem>
          ))}
          {/* Extra card for CTA */}
          <StaggerItem>
            <div className="card jp-card h-full flex flex-col items-center justify-center text-center border-dashed border-red-accent/20 hover:border-red-accent/40 min-h-[140px]">
              <div className="jp-kanji text-3xl text-red-accent/40 mb-2">研究</div>
              <p className="text-gray-400 text-xs mb-3">Explore all research tools</p>
              <Link to="/tools-research" className="btn-primary gap-1 text-xs px-4 py-2">
                View All Tools <FiArrowRight size={12} />
              </Link>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </section>
  )
}
