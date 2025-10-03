import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Star,
  CheckCircle,
  Phone,
  Mail,
  Building,
  Scale,
  Award,
  Clock,
  DollarSign,
  Filter,
  Users,
  FileText,
  Shield,
  Briefcase,
  Globe,
  X,
  MessageCircle,
  Calendar,
  Bookmark
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import type { Profile } from '../lib/supabase';

// Types for lawyer data (extending Profile)
interface Lawyer {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  bio?: string;
  role: string;
  agency_name?: string;
  license_number?: string;
  years_of_experience?: number;
  hourly_rate?: number;
  commission_rate?: number;
  avatar_url?: string;
  is_verified: boolean;
  location_city?: string;
  location_country?: string;
  languages?: string[];
  specializations?: LawyerSpecialization[];
  stats?: LawyerStats;
  created_at: string;
}

interface LawyerSpecialization {
  id: string;
  name: string;
  name_ru: string;
  icon?: string;
}

interface LawyerReview {
  id: string;
  lawyer_id: string;
  reviewer_name: string;
  rating: number;
  title?: string;
  comment: string;
  case_type?: string;
  is_verified: boolean;
  created_at: string;
}

interface LawyerStats {
  total_reviews: number;
  average_rating: number;
  total_cases: number;
  success_rate: number;
}

export function LawyersPage() {
  const { t } = useLanguage();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [filteredLawyers, setFilteredLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [lawyerReviews, setLawyerReviews] = useState<Record<string, LawyerReview[]>>({});

  useEffect(() => {
    fetchLawyers();
  }, []);

  useEffect(() => {
    if (lawyers.length > 0) {
      fetchAllReviews();
    }
  }, [lawyers]);

  useEffect(() => {
    filterLawyers();
  }, [lawyers, searchQuery, selectedCity, verifiedOnly]);

  const fetchLawyers = async () => {
    try {
      // Fetch lawyers from profiles with their specializations and stats
      const { data: lawyersData, error: lawyersError } = await supabase
        .from('profiles')
        .select(`
          *,
          specializations:lawyer_specialization_links(
            specialization:lawyer_specializations(
              id, name, name_ru, icon
            )
          ),
          stats:lawyer_stats(
            total_reviews, average_rating, total_cases, success_rate
          )
        `)
        .eq('role', 'lawyer')
        .order('is_verified', { ascending: false })
        .order('created_at', { ascending: false });

      if (lawyersError) throw lawyersError;

      // Transform the data to flatten specializations
      const transformedLawyers = (lawyersData || []).map(lawyer => ({
        ...lawyer,
        specializations: lawyer.specializations?.map((link: any) => link.specialization).filter(Boolean) || [],
        stats: lawyer.stats?.[0] || { total_reviews: 0, average_rating: 0, total_cases: 0, success_rate: 0 }
      }));

      setLawyers(transformedLawyers);
    } catch (error) {
      console.error('Error loading lawyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllReviews = async () => {
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('lawyer_reviews')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Group reviews by lawyer_id
      const reviewsByLawyer: Record<string, LawyerReview[]> = {};
      (reviewsData || []).forEach(review => {
        if (!reviewsByLawyer[review.lawyer_id]) {
          reviewsByLawyer[review.lawyer_id] = [];
        }
        reviewsByLawyer[review.lawyer_id].push(review);
      });

      setLawyerReviews(reviewsByLawyer);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleViewProfile = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setShowProfileModal(true);
  };

  const handleContact = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setShowContactModal(true);
  };

  const filterLawyers = () => {
    let filtered = [...lawyers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lawyer) =>
          lawyer.full_name?.toLowerCase().includes(query) ||
          lawyer.agency_name?.toLowerCase().includes(query) ||
          lawyer.bio?.toLowerCase().includes(query) ||
          lawyer.location_city?.toLowerCase().includes(query) ||
          lawyer.specializations?.some(spec =>
            spec.name.toLowerCase().includes(query) ||
            spec.name_ru.toLowerCase().includes(query)
          )
      );
    }

    if (verifiedOnly) {
      filtered = filtered.filter((lawyer) => lawyer.is_verified);
    }

    setFilteredLawyers(filtered);
  };

  const stats = [
    { icon: Users, value: lawyers.length, label: 'Total Lawyers' },
    { icon: CheckCircle, value: lawyers.filter(l => l.is_verified).length, label: 'Verified' },
    { icon: FileText, value: '500+', label: 'Cases Handled' },
    { icon: Globe, value: '25+', label: 'Countries' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 mt-4">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full mb-6">
              <Scale className="w-5 h-5 mr-2 text-yellow-400" />
              <span className="text-sm font-semibold">Legal Services for Real Estate</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-black mb-6">
              Professional Legal Services
            </h1>

            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              Connect with verified lawyers specialized in real estate transactions and cryptocurrency deals
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, specialization, or location"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-12 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-xl shadow-lg mb-3">
                    <Icon className="w-7 h-7 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="py-6 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  verifiedOnly
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Verified Only
              </button>
            </div>
            <div className="text-sm text-gray-600">
              Found {filteredLawyers.length} lawyers
            </div>
          </div>
        </div>
      </section>

      {/* LAWYERS GRID */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredLawyers.length === 0 ? (
            <div className="text-center py-16">
              <Scale className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No lawyers found</h3>
              <p className="text-gray-600">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLawyers.map((lawyer) => (
                <div
                  key={lawyer.id}
                  className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-100 overflow-hidden group"
                >
                  {/* Card Header with Gradient */}
                  <div className="relative h-32 bg-gradient-to-br from-blue-600 to-indigo-600">
                    {lawyer.is_verified && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                    <div className="absolute -bottom-12 left-6">
                      <img
                        src={lawyer.avatar_url || `https://ui-avatars.com/api/?name=${lawyer.full_name}&background=3b82f6&color=fff&bold=true&size=96`}
                        alt={lawyer.full_name}
                        className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover"
                      />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="pt-16 px-6 pb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {lawyer.full_name}
                    </h3>

                    {lawyer.agency_name && (
                      <p className="text-gray-600 mb-3 flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        {lawyer.agency_name}
                      </p>
                    )}

                    {lawyer.bio && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {lawyer.bio}
                      </p>
                    )}

                    {/* Specializations */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lawyer.specializations?.slice(0, 2).map((spec, index) => (
                        <span
                          key={spec.id}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            index === 0 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {spec.name}
                        </span>
                      ))}
                      {(lawyer.specializations?.length || 0) > 2 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          +{(lawyer.specializations?.length || 0) - 2} more
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900">{lawyer.years_of_experience || 0}+</div>
                        <div className="text-xs text-gray-500">Years Exp</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">{lawyer.stats?.total_cases || 0}+</div>
                        <div className="text-xs text-gray-500">Cases</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">{lawyer.stats?.average_rating?.toFixed(1) || '0.0'}</div>
                        <div className="text-xs text-gray-500">Rating</div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4 text-sm">
                      {lawyer.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{lawyer.email}</span>
                        </div>
                      )}
                      {lawyer.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{lawyer.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Commission Rate & Hourly Rate */}
                    <div className="space-y-2 mb-4">
                      {lawyer.commission_rate && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-600">Commission</span>
                          <span className="font-bold text-green-600 text-sm">
                            {(lawyer.commission_rate * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {lawyer.hourly_rate && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-600">Hourly Rate</span>
                          <span className="font-bold text-blue-600 text-sm">
                            ${lawyer.hourly_rate}/hr
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => {
                        const avgRating = lawyer.stats?.average_rating || 0;
                        return (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(avgRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        );
                      })}
                      <span className="text-sm text-gray-600 ml-2">
                        {lawyer.stats?.average_rating?.toFixed(1) || '0.0'} ({lawyer.stats?.total_reviews || 0} reviews)
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleViewProfile(lawyer)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => handleContact(lawyer)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-6 text-white/80" />
          <h2 className="text-3xl font-bold mb-4">
            Are you a lawyer? Join our platform!
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Register as a verified legal professional and connect with clients worldwide
          </p>
          <Link
            to="/auth?mode=register"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-gray-100 transition-all"
          >
            <Briefcase className="w-5 h-5 mr-2" />
            Register as Lawyer
          </Link>
        </div>
      </section>

      {/* PROFILE MODAL */}
      {showProfileModal && selectedLawyer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Lawyer Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <img
                  src={selectedLawyer.avatar_url || `https://ui-avatars.com/api/?name=${selectedLawyer.full_name}&background=3b82f6&color=fff&bold=true&size=96`}
                  alt={selectedLawyer.full_name}
                  className="w-20 h-20 rounded-2xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedLawyer.full_name}</h3>
                    {selectedLawyer.is_verified && (
                      <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                  </div>
                  {selectedLawyer.agency_name && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      {selectedLawyer.agency_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {selectedLawyer.bio && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                  <p className="text-gray-600 leading-relaxed">{selectedLawyer.bio}</p>
                </div>
              )}

              {/* Specializations */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Specializations</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    Real Estate Law
                  </span>
                  <span className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    Crypto Transactions
                  </span>
                  <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                    International Law
                  </span>
                  <span className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">
                    Contract Law
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-2">
                  {selectedLawyer.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{selectedLawyer.email}</span>
                    </div>
                  )}
                  {selectedLawyer.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{selectedLawyer.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews */}
              {lawyerReviews[selectedLawyer.id] && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Reviews</h4>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">
                        {calculateAverageRating(lawyerReviews[selectedLawyer.id])} ({lawyerReviews[selectedLawyer.id].length} reviews)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {lawyerReviews[selectedLawyer.id].slice(0, 5).map((review) => (
                      <div key={review.id} className="border-l-4 border-blue-100 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="font-medium text-sm text-gray-900">{review.author}</span>
                          <span className="text-xs text-gray-500">{new Date(review.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    handleContact(selectedLawyer);
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
                >
                  <MessageCircle className="w-4 h-4 inline mr-2" />
                  Contact Now
                </button>
                <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all">
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT MODAL */}
      {showContactModal && selectedLawyer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Contact Lawyer</h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Lawyer Info */}
              <div className="flex items-center gap-3 mb-6">
                <img
                  src={selectedLawyer.avatar_url || `https://ui-avatars.com/api/?name=${selectedLawyer.full_name}&background=3b82f6&color=fff&bold=true&size=48`}
                  alt={selectedLawyer.full_name}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedLawyer.full_name}</h3>
                  {selectedLawyer.agency_name && (
                    <p className="text-sm text-gray-600">{selectedLawyer.agency_name}</p>
                  )}
                  {selectedLawyer.location_city && selectedLawyer.location_country && (
                    <p className="text-xs text-gray-500">{selectedLawyer.location_city}, {selectedLawyer.location_country}</p>
                  )}
                </div>
              </div>

              {/* Contact Options */}
              <div className="space-y-3">
                {selectedLawyer.email && (
                  <a
                    href={`mailto:${selectedLawyer.email}?subject=Legal Inquiry from MYES.GLOBAL`}
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Send Email</div>
                      <div className="text-sm text-gray-600">{selectedLawyer.email}</div>
                    </div>
                  </a>
                )}

                {selectedLawyer.phone && (
                  <a
                    href={`tel:${selectedLawyer.phone}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Call Now</div>
                      <div className="text-sm text-gray-600">{selectedLawyer.phone}</div>
                    </div>
                  </a>
                )}

                <button className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors w-full">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Schedule Meeting</div>
                    <div className="text-sm text-gray-600">Book a consultation</div>
                  </div>
                </button>

                <Link
                  to="/chats"
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  onClick={() => setShowContactModal(false)}
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Start Chat</div>
                    <div className="text-sm text-gray-600">Send a message</div>
                  </div>
                </Link>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-900 mb-1">Secure Communication</div>
                    <div className="text-blue-700">All communications are encrypted and your information is protected.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}