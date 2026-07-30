'use client'

import { type FormEvent } from 'react'
import Button from '../ui/Button'
import { Field, Select, inputClasses, textareaClasses } from '../ui/formFields'
import { HEADING_SECTION } from '../ui/headings'

export default function MmForm() {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className={HEADING_SECTION}>Become a partner</h2>
          <p className="mt-4 text-gray-600">
            Sign up to test our Multi-Account &amp; Currency Tool and learn more about our
            partnership programs.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 max-w-3xl mx-auto">
          <p className="text-xs text-gray-600 mb-4">
            <span className="text-[#E94E1B]">*</span> Mandatory fields
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <Field>
              <input type="text" placeholder="*First Name" className={inputClasses} />
            </Field>
            <Field>
              <input type="text" placeholder="*Last Name" className={inputClasses} />
            </Field>
          </div>

          <div className="mt-4">
            <Field>
              <input type="text" placeholder="Company" className={inputClasses} />
            </Field>
          </div>

          <div className="mt-4">
            <Field>
              <input type="email" placeholder="*Email" className={inputClasses} />
            </Field>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <Field>
              <Select defaultValue="India">
                <option>Switzerland</option>
                <option>United Kingdom</option>
                <option>United States</option>
                <option>India</option>
              </Select>
            </Field>
            <Field>
              <Select defaultValue="English">
                <option>English</option>
                <option>Français</option>
                <option>Español</option>
                <option>Deutsch</option>
                <option>Русский</option>
                <option>Italiano</option>
                <option>العربية</option>
                <option>简体中文</option>
                <option>繁體中文</option>
                <option>Česky</option>
              </Select>
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-[120px_1fr] gap-4">
            <Field>
              <Select defaultValue="+91">
                <option>+41</option>
                <option>+44</option>
                <option>+1</option>
                <option>+91</option>
              </Select>
            </Field>
            <Field>
              <input type="tel" placeholder="*Phone" className={inputClasses} />
            </Field>
          </div>

          <div className="mt-4">
            <Field>
              <textarea rows={4} placeholder="Comments" className={textareaClasses} />
            </Field>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="primary" type="submit" className="px-10 py-3 rounded-md">
              Submit
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
