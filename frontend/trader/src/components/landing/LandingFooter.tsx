import Link from 'next/link'
import Image from 'next/image'
import { Phone } from 'lucide-react'

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          <div className="lg:col-span-2">
            <Link href="/" aria-label="TuskaEx home" className="inline-flex items-center gap-2 mb-4">
              <Image
                src="/marketing/tuskaex-logo.png"
                alt="TuskaEx"
                width={1947}
                height={361}
                className="h-9 w-auto"
              />
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed mb-3 max-w-sm">
              Professional multi-asset trading platform for serious traders.
            </p>
            <p className="text-gray-500 text-sm">
              <span className="font-medium text-gray-900">Headquarters:</span><br />
              Rue de la Tour-de-l&apos;Île 4, 1204 Genève
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-4">Products</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/platforms" className="hover:text-[#E94E1B] transition-colors">Trading Platforms</Link></li>
              <li><Link href="/auth/register" className="hover:text-[#E94E1B] transition-colors">Open Live Account</Link></li>
              <li><Link href="/demo-account" className="hover:text-[#E94E1B] transition-colors">Demo Account</Link></li>
              <li><Link href="/partners" className="hover:text-[#E94E1B] transition-colors">Become a Partner</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-4">Company</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/about" className="hover:text-[#E94E1B] transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#E94E1B] transition-colors">Contact</Link></li>
              <li><Link href="/policy" className="hover:text-[#E94E1B] transition-colors">Policy & Legal</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-4">Support</p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/contact" className="hover:text-[#E94E1B] transition-colors">Contact Support</Link></li>
              <li>
                <a
                  href="tel:+33759159987"
                  className="inline-flex items-center gap-2 hover:text-[#E94E1B] transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>+33 7 59 15 99 87</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} TuskaEx. All rights reserved.</p>
          <div className="flex items-center gap-5 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-[#E94E1B] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#E94E1B] transition-colors">Terms of Service</Link>
            <Link href="/risk" className="hover:text-[#E94E1B] transition-colors">Risk Disclosure</Link>
            <Link href="/account-deletion" className="hover:text-[#E94E1B] transition-colors">Account Deletion</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
