import { ChevronRight } from 'lucide-react'

interface AnnualReportCardProps {
  dare: string
  inWord: string
  action: string
  label: string
}

function AnnualReportCard({ dare, inWord, action, label }: AnnualReportCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 flex items-center gap-5 min-h-[200px]">
      <div className="relative w-32 h-44 md:w-40 md:h-52 bg-gray-50 rounded-md shadow-md flex items-center justify-center flex-shrink-0">
        <span
          className="absolute -right-3 top-4 w-10 h-10 rounded-full bg-[#E94E1B]"
          aria-hidden="true"
        />
        <span className="font-extrabold text-gray-900 text-sm md:text-base uppercase tracking-tight text-center">
          {dare}
          <br />
          {inWord}
          <br />
          {action}
        </span>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gray-600 font-semibold">{label}</p>
      </div>
    </div>
  )
}

interface InvestmentCardProps {
  ir: string
  caseTitle: string
}

function InvestmentCard({ ir, caseTitle }: InvestmentCardProps) {
  return (
    <div className="relative bg-white border border-gray-200 rounded-2xl p-6 md:p-8 min-h-[200px] flex items-center overflow-hidden">
      <div className="relative z-10">
        <p className="text-xs uppercase tracking-[0.18em] text-gray-600 font-semibold">{ir}</p>
        <h3 className="mt-2 text-xl md:text-3xl font-extrabold uppercase tracking-tight text-gray-900 leading-tight">
          {caseTitle}
        </h3>
      </div>
      <div
        className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 w-32 h-32 md:w-44 md:h-44 rounded-full border-[14px] md:border-[18px] border-[#E94E1B]/70"
        aria-hidden="true"
      />
    </div>
  )
}

export default function AnnualReport() {
  return (
    <section className="bg-white">
      <div className="w-full mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-5">
          <AnnualReportCard dare="Dare" inWord="In" action="Action" label="Annual Report" />
          <InvestmentCard ir="Investor Relations" caseTitle="Successful Investment Case" />
        </div>

        <div className="mt-6 flex justify-end items-center gap-3">
          <span className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E94E1B]" />
            <span className="w-2 h-2 rounded-full bg-gray-200" />
          </span>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-[#E94E1B] text-white flex items-center justify-center hover:bg-[#E94E1B] transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  )
}
