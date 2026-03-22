'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

interface FormData {
    name: string
    email: string
    subject: string
    message: string
}

export default function ContactPage() {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        subject: '',
        message: '',
    })
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Log form data to console for now
        console.log('Form submitted:', formData)

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setSubmitted(true)
        setFormData({ name: '', email: '', subject: '', message: '' })
        setLoading(false)

        // Reset success message after 3 seconds
        setTimeout(() => setSubmitted(false), 3000)
    }

    return (
        <div className="min-h-screen bg-light-bg dark:bg-bg-page transition-colors">
            {/* Top Navigation */}
            <Navigation />

            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Hero Section */}
                <section className="text-center mb-12 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold text-light-text dark:text-text-main mb-4">Get in Touch</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Have questions? We'd love to hear from you.
                    </p>
                </section>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left: Contact Info */}
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-light-text dark:text-text-main mb-6">Contact Information</h2>

                        {/* Email Card */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-cyan-indigo opacity-10 dark:opacity-20 group-hover:opacity-15 dark:group-hover:opacity-30 blur-lg rounded-lg transition-opacity" />
                            <div className="relative bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-accent-cyan dark:hover:border-accent-cyan transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl text-accent-indigo dark:text-accent-cyan">📧</div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-light-text dark:text-text-main mb-2">Email</h3>
                                        <p className="text-gray-600 dark:text-gray-400">support@courseai.com</p>
                                        <p className="text-gray-600 dark:text-gray-400">hello@courseai.com</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Address Card */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-cyan-indigo opacity-10 dark:opacity-20 group-hover:opacity-15 dark:group-hover:opacity-30 blur-lg rounded-lg transition-opacity" />
                            <div className="relative bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-accent-cyan dark:hover:border-accent-cyan transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl text-accent-indigo dark:text-accent-cyan">📍</div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-light-text dark:text-text-main mb-2">Address</h3>
                                        <p className="text-gray-600 dark:text-gray-400">San Francisco, CA 94105</p>
                                        <p className="text-gray-600 dark:text-gray-400">United States</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phone Card */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-cyan-indigo opacity-10 dark:opacity-20 group-hover:opacity-15 dark:group-hover:opacity-30 blur-lg rounded-lg transition-opacity" />
                            <div className="relative bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-accent-cyan dark:hover:border-accent-cyan transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl text-accent-indigo dark:text-accent-cyan">📱</div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-light-text dark:text-text-main mb-2">Phone</h3>
                                        <p className="text-gray-600 dark:text-gray-400">+1 (555) 123-4567</p>
                                        <p className="text-gray-600 dark:text-gray-400">Mon - Fri, 9am - 6pm PST</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Contact Form */}
                    <div className="animate-fade-in">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-cyan-indigo opacity-10 dark:opacity-20 blur-2xl rounded-xl" />
                            <div className="relative bg-white dark:bg-bg-card border border-gray-200 dark:border-gray-800 rounded-xl p-8">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Name */}
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-semibold text-light-text dark:text-text-main mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-light-text dark:text-text-main placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-accent-cyan dark:focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan focus:ring-opacity-30 dark:focus:ring-opacity-30 transition-colors"
                                            placeholder="Your name"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-semibold text-light-text dark:text-text-main mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-light-text dark:text-text-main placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-accent-cyan dark:focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan focus:ring-opacity-30 dark:focus:ring-opacity-30 transition-colors"
                                            placeholder="your@email.com"
                                        />
                                    </div>

                                    {/* Subject */}
                                    <div>
                                        <label htmlFor="subject" className="block text-sm font-semibold text-light-text dark:text-text-main mb-2">
                                            Subject
                                        </label>
                                        <input
                                            type="text"
                                            id="subject"
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-light-text dark:text-text-main placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-accent-cyan dark:focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan focus:ring-opacity-30 dark:focus:ring-opacity-30 transition-colors"
                                            placeholder="How can we help?"
                                        />
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label htmlFor="message" className="block text-sm font-semibold text-light-text dark:text-text-main mb-2">
                                            Message
                                        </label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows={5}
                                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-light-text dark:text-text-main placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-accent-cyan dark:focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan focus:ring-opacity-30 dark:focus:ring-opacity-30 transition-colors resize-none"
                                            placeholder="Tell us what you think..."
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-gradient-to-r from-accent-cyan to-accent-indigo text-white font-semibold rounded-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Sending...
                                            </span>
                                        ) : (
                                            'Send Message'
                                        )}
                                    </button>

                                    {/* Success Message */}
                                    {submitted && (
                                        <div
                                            className="p-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-200 animate-pulse"
                                        >
                                            ✓ Message sent successfully! We'll get back to you soon.
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
