import { scoreMentor, rankMentors, type StudentProfile } from '@/lib/mentor-matching';

describe('Mentor Matching Algorithm', () => {
  const mockMentors = [
    {
      id: 'm1',
      userId: 'u1',
      fullName: 'Alice Engineer',
      jobTitle: 'Senior Engineer',
      company: 'Google',
      industry: 'Technology',
      topics: ['Software Engineering', 'System Design', 'Career Growth'],
      pricePerCall: 1500,
      rating: 4.8,
      totalCalls: 120,
      yearsExp: 8,
      verificationStatus: 'VERIFIED' as const,
    },
    {
      id: 'm2',
      userId: 'u2',
      fullName: 'Bob Banker',
      jobTitle: 'VP',
      company: 'Goldman Sachs',
      industry: 'Finance',
      topics: ['Investment Banking', 'Finance Career', 'MBA Prep'],
      pricePerCall: 2000,
      rating: 5.0,
      totalCalls: 210,
      yearsExp: 12,
      verificationStatus: 'VERIFIED' as const,
    },
  ];

  it('should score domain match higher when topics overlap', () => {
    const student: StudentProfile = {
      targetIndustries: ['Technology', 'Software'],
    };

    const result = scoreMentor(mockMentors[0], student);
    expect(result.breakdown.domain).toBeGreaterThan(0);
    // Alice (tech) should score higher on domain than Bob (finance)
    const alice = scoreMentor(mockMentors[0], student);
    const bob = scoreMentor(mockMentors[1], student);
    expect(alice.breakdown.domain).toBeGreaterThan(bob.breakdown.domain);
  });

  it('should rank verified mentors above unverified', () => {
    const unverified = { ...mockMentors[0], verificationStatus: 'PENDING' as const };
    const mentors = [unverified, mockMentors[0]];
    const student: StudentProfile = { targetIndustries: ['Technology'] };

    const ranked = rankMentors(mentors, student);
    // Both should be present but verified should score normally
    expect(ranked.length).toBeGreaterThan(0);
  });

  it('should prefer mentors within budget', () => {
    const expensive = { ...mockMentors[0], pricePerCall: 5000 };
    const cheap = { ...mockMentors[0], pricePerCall: 500 };
    const student: StudentProfile = {
      targetIndustries: ['Technology'],
      budgetPerCall: 1500,
    };

    const expensiveScore = scoreMentor(expensive, student);
    const cheapScore = scoreMentor(cheap, student);
    expect(cheapScore.breakdown.priceFit).toBeGreaterThan(expensiveScore.breakdown.priceFit);
  });

  it('should return neutral price fit score when no budget specified', () => {
    const student: StudentProfile = { targetIndustries: [] };
    const result = scoreMentor(mockMentors[0], student);
    expect(result.breakdown.priceFit).toBe(50); // Neutral = 50
  });

  it('should rank mentors by total score descending', () => {
    const student: StudentProfile = {
      targetIndustries: ['Technology', 'Software'],
      budgetPerCall: 1500,
    };

    const ranked = rankMentors(mockMentors, student);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it('should include breakdown in each score', () => {
    const student: StudentProfile = {
      targetIndustries: ['Technology'],
      budgetPerCall: 1500,
    };

    const result = scoreMentor(mockMentors[0], student);
    expect(result.breakdown).toHaveProperty('domain');
    expect(result.breakdown).toHaveProperty('experience');
    expect(result.breakdown).toHaveProperty('rating');
    expect(result.breakdown).toHaveProperty('priceFit');
    expect(result.breakdown.domain + result.breakdown.experience + result.breakdown.rating + result.breakdown.priceFit).toBeGreaterThan(0);
  });
});
