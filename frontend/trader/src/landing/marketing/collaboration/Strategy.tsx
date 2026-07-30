'use client'

import { useState } from 'react'
import Eyebrow from '../ui/Eyebrow'
import Button from '../ui/Button'
import { HEADING_SECTION } from '../ui/headings'

interface Step {
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    title: 'Understanding your needs',
    body: 'Your dedicated TuskaEx partner will take the time to get in touch with your goals, challenges and priorities in order to provide you with tailored solutions that meet your specific requirements.',
  },
  {
    title: 'Due Diligence',
    body: 'Once your needs are defined, we conduct in-depth research to understand your structure, activities, and market. Using a holistic approach, we assess the viability of...',
  },
  {
    title: 'Building your custom solution',
    body: 'Leveraging our understanding of your needs and the findings from the due diligence process, we collaborate to craft a solution that ticks all the boxes. Our experienced…',
  },
  {
    title: 'Testing & Integration',
    body: 'Before launch, we rigorously test your solution for seamless integration with your existing systems and workflows, and smooth operation. We make any necessary…',
  },
  {
    title: 'Managing Customer Success',
    body: 'After launch, we continue to provide ongoing support, regular check-ins, and continuous optimisation based on your feedback. Our team is always available for…',
  },
]

function StepIllustration() {
  return (
    <div className="relative bg-gray-50 rounded-3xl w-full aspect-square max-w-md mx-auto flex items-center justify-center overflow-hidden">
      <div className="relative w-48 h-48 md:w-60 md:h-60">
        <div
          className="absolute inset-0 rounded-full border-[14px] md:border-[18px] border-[#E94E1B]"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 rounded-full border-[14px] md:border-[18px] border-[#E94E1B]/30"
          aria-hidden="true"
        />
        <div className="absolute inset-6 bg-white rounded-md shadow-md flex flex-col gap-1.5 p-3 md:p-4">
          <span className="h-2 rounded bg-gray-900/15" />
          <span className="h-2 rounded bg-gray-900/10 w-3/4" />
          <span className="h-2 rounded bg-gray-900/15 w-5/6" />
          <span className="h-2 rounded bg-[#E94E1B]/40 w-2/3" />
        </div>
      </div>
      <span
        className="absolute top-10 right-10 w-3 h-3 rounded-full bg-[#E94E1B]"
        aria-hidden="true"
      />
    </div>
  )
}

export default function Strategy() {
  const [active, setActive] = useState(0)

  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <div className="text-center max-w-3xl mx-auto">
          <Eyebrow>Strategy</Eyebrow>
          <h2 className={`${HEADING_SECTION} mt-3`}>
            The step-by-step to a successful partnership
          </h2>
          <p className="mt-5 text-gray-600 leading-relaxed">
            Our institutional experts have a clear plan in mind to guarantee that you and your
            business have the right financial shoulder to lean on: knowledge, accompaniment and
            thorough analysis, all along.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <ol className="flex flex-col">
              {STEPS.map((step, i) => {
                const isActive = i === active
                return (
                  <li
                    key={step.title}
                    onMouseEnter={() => setActive(i)}
                    className={`pl-5 py-5 border-l-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'border-[#E94E1B]'
                        : 'border-gray-200 hover:border-[#E94E1B]/40'
                    }`}
                  >
                    <h3 className="text-sm md:text-base font-bold text-gray-900">
                      {i + 1}. {step.title}
                    </h3>
                    {isActive && (
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-lg">
                        {step.body}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>

            <div className="mt-8">
              <Button variant="primary" className="px-6 py-3 rounded-md">
                Work with us
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <StepIllustration />
          </div>
        </div>
      </div>
    </section>
  )
}
