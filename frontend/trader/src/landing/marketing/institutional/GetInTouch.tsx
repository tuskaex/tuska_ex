'use client'

import { type FormEvent } from 'react'
import Button from '../ui/Button'
import { Field, Select, inputClasses, textareaClasses } from '../ui/formFields'
import { HEADING_SECTION } from '../ui/headings'

export default function GetInTouch() {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-6 py-20 md:py-24">
        <h2 className={HEADING_SECTION}>Get in touch</h2>
        <p className="mt-4 text-gray-600">
          We are eager to know how we can further customize our solutions to your needs. Reach
          out now.
        </p>

        <form onSubmit={onSubmit} className="mt-10 max-w-3xl">
          <p className="text-xs text-gray-600 mb-4">
            <span className="text-[#E94E1B]">*</span> Mandatory fields
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input type="text" className={inputClasses} />
            </Field>
            <Field label="Last Name" required>
              <input type="text" className={inputClasses} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Email" required>
              <input type="email" className={inputClasses} />
            </Field>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <Field label="Country" required>
              <Select defaultValue="India">
                <option>Switzerland</option>
                <option>United Kingdom</option>
                <option>United States</option>
                <option>India</option>
              </Select>
            </Field>
            <Field label="Language" required>
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
            <Field label="Code">
              <Select defaultValue="+91">
                <option>+41</option>
                <option>+44</option>
                <option>+1</option>
                <option>+91</option>
              </Select>
            </Field>
            <Field label="Phone">
              <input type="tel" className={inputClasses} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Comments">
              <textarea rows={4} className={textareaClasses} />
            </Field>
          </div>

          <div className="mt-6">
            <Button variant="primary" type="submit" className="w-full py-3 rounded-md">
              Submit
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
