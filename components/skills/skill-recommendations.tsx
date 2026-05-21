'use client';

import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, Users, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export interface SkillRecommendation {
  skill: string;
  relevanceScore: number;
  reason: string;
  sourceEmployees: string[];
}

interface SkillRecommendationsProps {
  recommendations: SkillRecommendation[];
  onExploreSkill?: (skill: string) => void;
}

export function SkillRecommendations({
  recommendations,
  onExploreSkill,
}: SkillRecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <Card variant="outlined">
        <div className="p-6 text-center">
          <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No skill recommendations yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Complete your profile to get personalized recommendations
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-900">
            Recommended Skills for You
          </h3>
        </div>

        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.skill}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 border border-slate-200 rounded-lg hover:border-teal-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 mb-1">
                    {rec.skill}
                  </h4>
                  <p className="text-sm text-slate-600">{rec.reason}</p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <TrendingUp className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-semibold text-teal-600">
                    {Math.round(rec.relevanceScore)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {rec.sourceEmployees.length}+ employees
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExploreSkill?.(rec.skill)}
                >
                  Explore
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
}
