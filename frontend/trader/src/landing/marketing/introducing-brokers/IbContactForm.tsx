'use client'

import { type FormEvent } from 'react'
import Button from '../ui/Button'
import { Field, Select, inputClasses, textareaClasses } from '../ui/formFields'

export default function IbContactForm() {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-gray-900">
            Become a partner
          </h2>
          <p className="mt-3 text-gray-600 text-sm md:text-base">
            Contact us to start your winning partnership today.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 max-w-3xl mx-auto">
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
            <Field label="Company">
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
                <option>Italiano</option>
              </Select>
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-[120px_1fr] gap-4">
            <Field label="" required>
              <Select defaultValue="+91">
                <option value="+41">+41</option>
                <option value="+44">+44</option>
                <option value="+1">+1</option>
                <option value="+91">+91</option>
              </Select>
            </Field>
            <Field label="Phone" required>
              <input type="tel" className={inputClasses} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Comments">
              <textarea rows={4} className={textareaClasses} />
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
