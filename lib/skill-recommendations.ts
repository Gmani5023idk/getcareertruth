import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SkillRecommendation {
  skill: string;
  relevanceScore: number;
  reason: string;
  sourceEmployees: string[];
}

export interface EmployeeRecommendation {
  employeeId: string;
  employeeName: string;
  employeeJobTitle: string;
  employeeCompany: string;
  employeeIndustry: string;
  employeeRating: number;
  employeePricePerCall: number;
  employeeTopics: string[];
  matchScore: number;
  matchReasons: string[];
}

/**
 * Get skill recommendations for a student based on their profile
 */
export async function getSkillRecommendationsForStudent(
  studentId: string
): Promise<SkillRecommendation[]> {
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    include: {
      user: true,
    },
  });

  if (!student) {
    return [];
  }

  // Get all employees
  const employees = await prisma.employeeProfile.findMany({
    where: {
      verificationStatus: 'VERIFIED',
    },
    include: {
      user: true,
    },
  });

  // Analyze skills from employee topics
  const skillMap = new Map<string, {
    count: number;
    employees: string[];
    industries: Set<string>;
  }>();

  employees.forEach((employee) => {
    employee.topics.forEach((topic) => {
      const existing = skillMap.get(topic) || {
        count: 0,
        employees: [],
        industries: new Set(),
      };
      existing.count++;
      existing.employees.push(employee.fullName);
      existing.industries.add(employee.industry);
      skillMap.set(topic, existing);
    });
  });

  // Calculate relevance based on student's target industries
  const recommendations: SkillRecommendation[] = [];

  skillMap.forEach((data, skill) => {
    let relevanceScore = data.count;

    // Boost score if skill is in student's target industries
    if (student.targetIndustries.some((ind) => data.industries.has(ind))) {
      relevanceScore *= 1.5;
    }

    // Normalize score
    relevanceScore = Math.min(relevanceScore, 100);

    let reason = `Popular skill among ${data.count} verified employees`;
    if (student.targetIndustries.some((ind) => data.industries.has(ind))) {
      reason += ` in your target industry`;
    }

    recommendations.push({
      skill,
      relevanceScore,
      reason,
      sourceEmployees: data.employees.slice(0, 3),
    });
  });

  // Sort by relevance score and return top 10
  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

/**
 * Get employee recommendations for a student based on their profile
 */
export async function getEmployeeRecommendationsForStudent(
  studentId: string,
  limit: number = 10
): Promise<EmployeeRecommendation[]> {
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    include: {
      user: true,
    },
  });

  if (!student) {
    return [];
  }

  // Get all verified employees
  const employees = await prisma.employeeProfile.findMany({
    where: {
      verificationStatus: 'VERIFIED',
    },
    include: {
      user: true,
    },
  });

  const recommendations: EmployeeRecommendation[] = [];

  employees.forEach((employee) => {
    let matchScore = 0;
    const matchReasons: string[] = [];

    // Industry match
    if (student.targetIndustries.includes(employee.industry)) {
      matchScore += 30;
      matchReasons.push(`Works in your target industry: ${employee.industry}`);
    }

    // Topic match
    const matchingTopics = employee.topics.filter((topic) =>
      (student.bio?.toLowerCase() || '').includes(topic.toLowerCase()) ||
      student.targetIndustries.some((ind) =>
        topic.toLowerCase().includes(ind.toLowerCase())
      )
    );
    if (matchingTopics.length > 0) {
      matchScore += matchingTopics.length * 10;
      matchReasons.push(
        `Expertise in: ${matchingTopics.slice(0, 2).join(', ')}`
      );
    }

    // Rating boost
    matchScore += employee.rating * 5;

    // Experience boost
    matchScore += employee.yearsExp * 2;

    // Normalize score
    matchScore = Math.min(matchScore, 100);

    if (matchScore > 0) {
      recommendations.push({
        employeeId: employee.userId,
        employeeName: employee.fullName,
        employeeJobTitle: employee.jobTitle,
        employeeCompany: employee.company,
        employeeIndustry: employee.industry,
        employeeRating: employee.rating,
        employeePricePerCall: employee.pricePerCall,
        employeeTopics: employee.topics,
        matchScore,
        matchReasons,
      });
    }
  });

  // Sort by match score and return top results
  return recommendations
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * Get employee recommendations for a parent based on their child's profile
 */
export async function getEmployeeRecommendationsForParent(
  parentId: string,
  limit: number = 10
): Promise<EmployeeRecommendation[]> {
  const parent = await prisma.parentProfile.findUnique({
    where: { userId: parentId },
    include: {
      user: true,
    },
  });

  if (!parent) {
    return [];
  }

  // Get all verified employees
  const employees = await prisma.employeeProfile.findMany({
    where: {
      verificationStatus: 'VERIFIED',
    },
    include: {
      user: true,
    },
  });

  const recommendations: EmployeeRecommendation[] = [];

  employees.forEach((employee) => {
    let matchScore = 0;
    const matchReasons: string[] = [];

    // Industry match based on child's course
    const relevantIndustries = getIndustriesForCourse(parent.childCourse || '');
    if (relevantIndustries.includes(employee.industry)) {
      matchScore += 30;
      matchReasons.push(`Relevant to ${parent.childCourse || 'child\'s course'}`);
    }

    // Topic match based on parent's concerns
    const matchingTopics = employee.topics.filter((topic) =>
      parent.concerns.some((concern) =>
        topic.toLowerCase().includes(concern.toLowerCase())
      )
    );
    if (matchingTopics.length > 0) {
      matchScore += matchingTopics.length * 10;
      matchReasons.push(
        `Addresses your concerns: ${matchingTopics.slice(0, 2).join(', ')}`
      );
    }

    // Rating boost
    matchScore += employee.rating * 5;

    // Experience boost
    matchScore += employee.yearsExp * 2;

    // Normalize score
    matchScore = Math.min(matchScore, 100);

    if (matchScore > 0) {
      recommendations.push({
        employeeId: employee.userId,
        employeeName: employee.fullName,
        employeeJobTitle: employee.jobTitle,
        employeeCompany: employee.company,
        employeeIndustry: employee.industry,
        employeeRating: employee.rating,
        employeePricePerCall: employee.pricePerCall,
        employeeTopics: employee.topics,
        matchScore,
        matchReasons,
      });
    }
  });

  // Sort by match score and return top results
  return recommendations
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * Helper function to map courses to industries
 */
function getIndustriesForCourse(course: string): string[] {
  const courseIndustryMap: Record<string, string[]> = {
    'Engineering': ['Technology', 'Manufacturing', 'Automotive'],
    'Computer Science': ['Technology', 'Software', 'AI/ML'],
    'Medicine': ['Healthcare', 'Pharmaceuticals'],
    'Business': ['Finance', 'Consulting', 'Marketing'],
    'Arts': ['Media', 'Design', 'Entertainment'],
    'Science': ['Research', 'Pharmaceuticals', 'Biotechnology'],
    'Commerce': ['Finance', 'Accounting', 'Banking'],
    'Law': ['Legal', 'Consulting'],
  };

  return courseIndustryMap[course] || [];
}
