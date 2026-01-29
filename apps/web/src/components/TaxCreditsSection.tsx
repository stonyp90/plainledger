/**
 * Tax Credits Section Component
 *
 * Displays tax credit eligibility for the organization with detailed breakdowns
 * and partner referral options.
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  Users,
  Building2,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  TaxCreditEligibility,
  EligibilityStatus,
  formatEligibilityStatus,
  formatCurrency,
  getTaxCreditsByIndustryAndProvince,
} from '../lib/taxCredits';
import TaxCreditPartnerModal from './TaxCreditPartnerModal';
import { useAuth } from '../lib/keycloak';

interface TaxCreditsSectionProps {
  industryId?: string;
  province?: string;
  organizationId: string;
}

export default function TaxCreditsSection({
  industryId,
  province,
  organizationId,
}: TaxCreditsSectionProps) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const [eligibilityData, setEligibilityData] = useState<TaxCreditEligibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCredit, setExpandedCredit] = useState<string | null>(null);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<any>(null);

  // Mock data for now - will be replaced with actual API call
  useEffect(() => {
    // TODO: Fetch actual eligibility data from GraphQL API
    const mockData: TaxCreditEligibility[] = [];
    setEligibilityData(mockData);
    setLoading(false);
  }, [industryId, province, organizationId]);

  const likelyEligible = eligibilityData.filter((e) => e.eligibilityStatus === 'likely');
  const possiblyEligible = eligibilityData.filter((e) => e.eligibilityStatus === 'possible');
  const needsReview = eligibilityData.filter((e) => e.eligibilityStatus === 'needs_review');

  const totalEstimatedMin = eligibilityData.reduce(
    (sum, e) => sum + e.estimatedBenefitMin,
    0
  );
  const totalEstimatedMax = eligibilityData.reduce(
    (sum, e) => sum + e.estimatedBenefitMax,
    0
  );

  const handleGetExpertHelp = (credit: TaxCreditEligibility) => {
    if (!credit.taxCredit.partnerReferralEnabled) return;
    setSelectedCredit(credit.taxCredit);
    setPartnerModalOpen(true);
  };

  const toggleExpand = (creditId: string) => {
    setExpandedCredit(expandedCredit === creditId ? null : creditId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title={language === 'fr' ? 'Probablement éligible' : 'Likely Eligible'}
          count={likelyEligible.length}
          color="green"
          icon={CheckCircle}
        />
        <SummaryCard
          title={language === 'fr' ? 'Possiblement éligible' : 'Possibly Eligible'}
          count={possiblyEligible.length}
          color="yellow"
          icon={AlertCircle}
        />
        <SummaryCard
          title={language === 'fr' ? 'À examiner' : 'Needs Review'}
          count={needsReview.length}
          color="blue"
          icon={Info}
        />
        <SummaryCard
          title={language === 'fr' ? 'Bénéfice estimé' : 'Estimated Benefit'}
          amount={totalEstimatedMax}
          color="purple"
          icon={DollarSign}
        />
      </div>

      {/* Eligibility List */}
      {eligibilityData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'fr'
              ? 'Aucune éligibilité aux crédits d\'impôt détectée pour le moment. Les données seront analysées lors du prochain traitement ETL.'
              : 'No tax credit eligibility detected yet. Data will be analyzed during the next ETL processing.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {eligibilityData.map((eligibility) => {
            const status = formatEligibilityStatus(eligibility.eligibilityStatus);
            const isExpanded = expandedCredit === eligibility.taxCredit.id;

            return (
              <div
                key={eligibility.taxCredit.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleExpand(eligibility.taxCredit.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {eligibility.taxCredit.shortName[language]}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}
                        >
                          {status.label}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {eligibility.eligibilityScore}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {eligibility.taxCredit.name[language]}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(eligibility.estimatedBenefitMax)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {language === 'fr' ? 'estimation' : 'estimated'}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="pt-4 space-y-4">
                      {/* Benefit Range */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {language === 'fr' ? 'Bénéfice estimé' : 'Estimated Benefit'}
                        </h4>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(eligibility.estimatedBenefitMin)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">-</span>
                          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(eligibility.estimatedBenefitMax)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          {eligibility.taxCredit.maxBenefit.description[language]}
                        </p>
                      </div>

                      {/* Criteria Results */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                          {language === 'fr' ? 'Critères d\'éligibilité' : 'Eligibility Criteria'}
                        </h4>
                        <div className="space-y-2">
                          {eligibility.criteriaMet.map((criterionId) => (
                            <div
                              key={criterionId}
                              className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>
                                {language === 'fr'
                                  ? `Critère satisfait: ${criterionId}`
                                  : `Criterion met: ${criterionId}`}
                              </span>
                            </div>
                          ))}
                          {eligibility.criteriaNotMet.map((criterionId) => (
                            <div
                              key={criterionId}
                              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                            >
                              <AlertCircle className="w-4 h-4" />
                              <span>
                                {language === 'fr'
                                  ? `Critère non satisfait: ${criterionId}`
                                  : `Criterion not met: ${criterionId}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <a
                          href={eligibility.taxCredit.documentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          {language === 'fr' ? 'Documentation officielle' : 'Official Documentation'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {eligibility.taxCredit.partnerReferralEnabled && (
                          <button
                            onClick={() => handleGetExpertHelp(eligibility)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            {language === 'fr' ? 'Obtenir de l\'aide experte' : 'Get Expert Help'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Partner Modal */}
      {selectedCredit && (
        <TaxCreditPartnerModal
          isOpen={partnerModalOpen}
          onClose={() => {
            setPartnerModalOpen(false);
            setSelectedCredit(null);
          }}
          taxCredit={selectedCredit}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  count?: number;
  amount?: number;
  color: 'green' | 'yellow' | 'blue' | 'purple';
  icon: React.ComponentType<{ className?: string }>;
}

function SummaryCard({ title, count, amount, color, icon: Icon }: SummaryCardProps) {
  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          {count !== undefined && (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
          )}
          {amount !== undefined && (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(amount)}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
