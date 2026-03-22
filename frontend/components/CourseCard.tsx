'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface CourseCardProps {
    id: number;
    title: string;
    explanation: string;
    created_at: string;
    onDelete?: () => void;
    completedTopics?: number;
}

export default function CourseCard({ id, title, explanation, created_at, onDelete, completedTopics: passedCompleted }: CourseCardProps) {
  const truncatedExplanation = (explanation || '').slice(0, 120) + ((explanation?.length || 0) > 120 ? '...' : '');

  const topics = (explanation || '').split(/^##\s+/gm).filter(s => s.trim());
  const totalTopics = Math.max(topics.length, 1);

  const [completedTopics, setCompletedTopics] = useState(passedCompleted ?? 0);

  useEffect(() => {
    if (passedCompleted === undefined) {
      const stored = localStorage.getItem(`iSchool_Progress_${id}`);
      if (stored) {
        setCompletedTopics(parseInt(stored, 10));
      } else {
        setCompletedTopics(Math.max(1, Math.floor(totalTopics * 0.2)));
      }
    } else {
      setCompletedTopics(passedCompleted);
    }
  }, [id, passedCompleted, totalTopics]);

  const safeCompleted = Math.min(Math.max(completedTopics, 0), totalTopics);
  const progressPercentage = (safeCompleted / totalTopics) * 100;

  return (
    <div className="group h-full relative rounded-xl border border-border-dim hover:border-border-soft bg-bg-card shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col">

      <div className="flex flex-col h-full relative z-0">

        {onDelete && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
            className="absolute top-3 right-3 z-20 w-7 h-7 flex items-center justify-center bg-bg-page text-text-faint rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 border border-border-dim hover:border-red-200 dark:hover:border-red-800 transition-all"
            title="Delete course"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}

        <Link href={`/lessons/${id}`} className="flex-1 p-5 flex flex-col cursor-pointer outline-none relative z-10">

          {/* Status Badge */}
          <div
            className="flex items-center gap-1.5 mb-4 w-fit px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{ background: 'var(--color-muted-green)', color: 'var(--color-sage)', border: '1px solid rgba(107,127,82,0.3)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--color-sage)' }} />
            AI Processed
          </div>

          {/* Title */}
          <h3 className="text-lg font-display font-semibold text-text-main mb-2.5 line-clamp-2 group-hover:text-terracotta transition-colors duration-200">
            {title}
          </h3>

          {/* Description */}
          <p className="text-text-muted text-sm mb-5 line-clamp-3 leading-relaxed flex-1">
            {truncatedExplanation}
          </p>

          {/* Progress Bar */}
          <div className="mb-4 mt-auto">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-semibold text-text-faint uppercase tracking-wide">Progress</span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-terracotta)' }}>
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-border-dim rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercentage}%`,
                  background: 'linear-gradient(90deg, var(--color-terracotta), var(--color-sand))',
                }}
              />
            </div>
            <p className="text-[9.5px] text-text-faint mt-1.5 font-medium text-right">
              {safeCompleted} of {totalTopics} topics complete
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3.5 border-t border-border-dim">
            <p className="text-text-faint text-[10px] uppercase font-medium tracking-wide">
              {new Date(created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
            <span
              className="text-xs font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              style={{ color: 'var(--color-terracotta)' }}
            >
              Open Lesson
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}