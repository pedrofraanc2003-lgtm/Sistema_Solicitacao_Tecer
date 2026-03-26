import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
}

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <Card className="p-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">{label}</span>
      <div className="mt-2 font-display text-3xl font-extrabold text-tecer-primary">{value}</div>
      {helper ? <div className="mt-2 text-xs text-tecer-grayMed">{helper}</div> : null}
    </Card>
  );
}

export default StatCard;
