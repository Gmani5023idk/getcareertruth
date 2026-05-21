'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, MapPin, Briefcase, ChevronDown, Check, X, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ProfilePicture from '@/components/ui/ProfilePicture';
import Link from 'next/link';

// Mock data
const mockEmployees = [
  { id: '1', name: 'Rahul Sharma', jobTitle: 'Senior Software Engineer', company: 'Google', industry: 'Technology', yearsOfExperience: 8, pricePerCall: 1500, topics: ['Software Engineering', 'Career Growth', 'FAANG Interview Prep'], verified: true, location: 'Bangalore', avatar: null, rating: 4.9, reviewCount: 124 },
  { id: '2', name: 'Priya Patel', jobTitle: 'Product Manager', company: 'Microsoft', industry: 'Technology', yearsOfExperience: 6, pricePerCall: 1200, topics: ['Product Management', 'Tech Strategy', 'Career Transition'], verified: true, location: 'Hyderabad', avatar: null, rating: 4.8, reviewCount: 89 },
  { id: '3', name: 'Amit Kumar', jobTitle: 'Data Scientist', company: 'Amazon', industry: 'Technology', yearsOfExperience: 5, pricePerCall: 1000, topics: ['Data Science', 'Machine Learning', 'AI/ML Career'], verified: true, location: 'Delhi', avatar: null, rating: 4.7, reviewCount: 56 },
  { id: '4', name: 'Sneha Reddy', jobTitle: 'UX Designer', company: 'Meta', industry: 'Technology', yearsOfExperience: 4, pricePerCall: 800, topics: ['UX Design', 'Product Design', 'Design Career'], verified: true, location: 'Mumbai', avatar: null, rating: 4.9, reviewCount: 42 },
  { id: '5', name: 'Vikram Singh', jobTitle: 'Investment Banker', company: 'Goldman Sachs', industry: 'Finance', yearsOfExperience: 10, pricePerCall: 2000, topics: ['Investment Banking', 'Finance Career', 'MBA Prep'], verified: true, location: 'Mumbai', avatar: null, rating: 5.0, reviewCount: 210 },
  { id: '6', name: 'Neha Gupta', jobTitle: 'Marketing Manager', company: 'Unilever', industry: 'FMCG', yearsOfExperience: 7, pricePerCall: 900, topics: ['Marketing', 'Brand Management', 'FMCG Career'], verified: false, location: 'Bangalore', avatar: null, rating: 4.6, reviewCount: 38 },
];

const industries = ['All', 'Technology', 'Finance', 'FMCG', 'Consulting', 'Healthcare'];
const priceRanges = ['All', 'Under ₹1000', '₹1000-₹1500', 'Above ₹1500'];

export default function EmployeeDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedPriceRange, setSelectedPriceRange] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const filteredEmployees = useMemo(() => {
    return mockEmployees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.topics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesIndustry = selectedIndustry === 'All' || emp.industry === selectedIndustry;
      
      let matchesPrice = true;
      if (selectedPriceRange === 'Under ₹1000') matchesPrice = emp.pricePerCall < 1000;
      else if (selectedPriceRange === '₹1000-₹1500') matchesPrice = emp.pricePerCall >= 1000 && emp.pricePerCall <= 1500;
      else if (selectedPriceRange === 'Above ₹1500') matchesPrice = emp.pricePerCall > 1500;

      return matchesSearch && matchesIndustry && matchesPrice;
    });
  }, [searchQuery, selectedIndustry, selectedPriceRange]);

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-20">
      {/* Search Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-30 pt-6 sm:pt-10 pb-6 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">Find Your Career Truth</h1>
              <p className="text-text-secondary text-sm sm:text-base font-medium">Talk to verified employees from companies you admire.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search name, company, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 sm:h-12 pl-12 pr-4 bg-surface-2 border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-base font-medium shadow-sm"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-2 h-14 sm:h-12 px-6 rounded-2xl border-border"
              >
                {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                <span className="font-bold">Filters</span>
                { (selectedIndustry !== 'All' || selectedPriceRange !== 'All') && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                )}
              </Button>
            </div>

            {/* Mobile/Tablet Collapsible Filters */}
            {showFilters && (
              <Card className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 border-primary/20 bg-primary/[0.02] animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Industry</label>
                  <select 
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-border font-bold text-sm outline-none focus:ring-2 ring-primary/20"
                  >
                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Price Range</label>
                  <select 
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-surface border border-border font-bold text-sm outline-none focus:ring-2 ring-primary/20"
                  >
                    {priceRanges.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                   <Button variant="ghost" onClick={() => { setSelectedIndustry('All'); setSelectedPriceRange('All'); setSearchQuery(''); }} className="w-full h-12 text-xs font-black uppercase">Clear All</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8">
           <p className="text-xs sm:text-sm font-bold text-text-secondary uppercase tracking-[0.15em]">
             Displaying <span className="text-primary">{filteredEmployees.length}</span> Professionals
           </p>
        </div>

        {filteredEmployees.length === 0 ? (
          <Card className="p-20 text-center border-dashed border-2">
            <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
               <Search className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-xl font-bold mb-1">No results found</h3>
            <p className="text-text-muted">Try adjusting your filters or search terms.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="p-0 overflow-hidden group hover:border-primary/30 hover:shadow-premium transition-all duration-500 flex flex-col border-2 border-transparent">
                <Link href={`/employees/${employee.id}`} className="p-6 sm:p-8 flex-1">
                  <div className="flex items-start gap-4 sm:gap-6 mb-6">
                    <div className="relative flex-shrink-0">
                      <ProfilePicture
                        src={employee.avatar}
                        alt={employee.name}
                        size={96}
                        verified={employee.verified}
                        editable={false}
                      />
                      {employee.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-success text-white p-1 rounded-full border-4 border-surface shadow-sm">
                           <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-lg sm:text-xl text-text-primary group-hover:text-primary transition-colors leading-tight mb-1 truncate">{employee.name}</h3>
                      <p className="text-sm font-bold text-text-secondary line-clamp-1 mb-1">{employee.jobTitle}</p>
                      <div className="flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-accent">{employee.company}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-4 text-xs font-bold text-text-muted">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{employee.yearsOfExperience}y Exp</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{employee.location}</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{employee.rating}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {employee.topics.slice(0, 2).map((topic) => (
                        <span key={topic} className="px-3 py-1 bg-surface-2 text-text-secondary text-[10px] font-black rounded-lg border border-border uppercase tracking-tighter">
                          {topic}
                        </span>
                      ))}
                      {employee.topics.length > 2 && (
                        <span className="px-3 py-1 bg-surface-2 text-text-muted text-[10px] font-black rounded-lg border border-border uppercase">
                          +{employee.topics.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="p-6 sm:p-8 bg-surface-2/30 border-t border-border flex items-center justify-between mt-auto">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-0.5">Booking Fee</div>
                    <div className="text-2xl font-black text-text-primary tracking-tighter">₹{employee.pricePerCall}</div>
                  </div>
                  <Link href={`/employees/${employee.id}`}>
                    <Button variant="primary" className="h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary/20 text-sm">
                      Book Now
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
