import { Plus } from 'lucide-react'
import Button from '../ui/Button'
import { HEADING_SECTION } from '../ui/headings'

interface Job {
  title: string
  type: string
  dept: string
  location: string
}

const JOBS: Job[] = [
  { title: 'Business Development Manager', type: 'Full-time', dept: 'Sales', location: 'Remote' },
  { title: 'Finance Officer', type: 'Full-time', dept: 'Administration', location: 'Remote' },
  { title: 'Document Digitization & Records Management Agent', type: 'Full-time', dept: 'Technology', location: 'Remote' },
  { title: 'Regulatory Compliance Officer', type: 'Full-time', dept: 'Legal Services', location: 'Remote' },
  { title: 'iOS Senior Software Engineer', type: 'Full-time', dept: 'Technology', location: 'Remote' },
  { title: 'Product Owner – Portal and banking services', type: 'Full-time', dept: 'Technology', location: 'Remote' },
  { title: 'Compliance Officer - Onboarding Corporate (9 months contract)', type: 'Contract', dept: 'Legal Services', location: 'Remote' },
  { title: 'Executive Administrative Assistant - 6 months contract', type: 'Contract', dept: 'Administration', location: 'Remote' },
  { title: 'Sales Executive - Securities Lending', type: 'Full-time', dept: 'Sales', location: 'Remote' },
]

export default function JoinUs() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <h2 className={`${HEADING_SECTION} text-center`}>Join us</h2>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-900 w-2/5">Job Title</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Type of Employment</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Department</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Location</th>
              </tr>
            </thead>
            <tbody>
              {JOBS.map((job) => (
                <tr
                  key={job.title}
                  className="border-b border-gray-200 hover:bg-gray-50/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <a href="#" className="text-[#D60101] hover:underline underline-offset-2">
                      {job.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{job.type}</td>
                  <td className="px-4 py-3 text-gray-600">{job.dept}</td>
                  <td className="px-4 py-3 text-gray-600">{job.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <a
            href="#"
            className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-[#D60101] transition-colors"
          >
            <span>See more</span>
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </a>
          <Button variant="primary" className="px-8 py-3 rounded-md">
            All jobs
          </Button>
        </div>
      </div>
    </section>
  )
}
