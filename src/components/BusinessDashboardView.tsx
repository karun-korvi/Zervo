import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  Layers,
  Network,
  Plus,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  B2B_INDUSTRIES,
  B2B_PLATFORM_FEE_RATE,
  CITY_HUB_CENTERS,
  CONNECTED_ECOSYSTEM_ROWS,
  SHIFT_GST_RATE,
  WORK_FORMATS,
  ZEVRO_CITIES,
} from '../data/zevroData';
import serviceChefCookingImg from '../assets/images/service_chef_cooking_1794752968032.jpg';
import serviceDeliveryFleetImg from '../assets/images/service_delivery_fleet_1794748639498.jpg';
import serviceElectricalPanelImg from '../assets/images/service_electrical_panel_1794748348641.jpg';
import serviceEventsCrewImg from '../assets/images/service_events_crew_1794751981199.jpg';
import serviceFacilityLogisticsImg from '../assets/images/service_facility_logistics_1794748349740.jpg';
import serviceHospitalSupportImg from '../assets/images/service_hospital_support_1794751980728.jpg';
import serviceItProfessionalImg from '../assets/images/service_it_professional_1794752969164.jpg';
import serviceManufacturingOpsImg from '../assets/images/service_manufacturing_ops_1794751980378.jpg';
import servicePickerPackerImg from '../assets/images/service_picker_packer_1794748637764.jpg';
import serviceRetailPantryImg from '../assets/images/service_retail_pantry_staff_1794748639420.jpg';
import serviceTutorEducationImg from '../assets/images/service_tutor_education_1794752968048.jpg';
import {
  B2BIndustry,
  BusinessRequirement,
  JobShift,
  ScreenId,
  ServiceCategory,
  ShiftBucket,
  VerificationQueueItem,
  WorkFormat,
} from '../types/zevro';

interface BusinessDashboardViewProps {
  selectedCity: string;
  businessRequirements: BusinessRequirement[];
  verificationQueue: VerificationQueueItem[];
  onCreateRequirement: (req: BusinessRequirement, linkedShift: JobShift) => void;
  onCheckInWorkers: (reqId: string, delta: number) => void;
  onResolveVerification: (verId: string, nextStatus: 'Approved' | 'Flagged') => void;
  onNavigate: (screen: ScreenId) => void;
}

type BusinessHubTab = 'workforce' | 'post' | 'ecosystem' | 'verification' | 'revenue';

const INDUSTRY_TRADE_IMAGE: Record<
  B2BIndustry,
  { trade: Exclude<ServiceCategory, 'All'>; imageUrl: string; imageAlt: string }
> = {
  'Office & Corporate': {
    trade: 'Professional Services',
    imageUrl: serviceItProfessionalImg,
    imageAlt: 'Corporate office assistants and operations staff at desk',
  },
  'Warehouse & E-commerce': {
    trade: 'Logistics & Warehouse',
    imageUrl: servicePickerPackerImg,
    imageAlt: 'Warehouse pickers and packers sorting labeled boxes',
  },
  'Hospitals & Healthcare': {
    trade: 'Healthcare & Medical',
    imageUrl: serviceHospitalSupportImg,
    imageAlt: 'Hospital nurses and ward support crew',
  },
  'Schools & Colleges': {
    trade: 'Education & Tutoring',
    imageUrl: serviceTutorEducationImg,
    imageAlt: 'School teachers and college faculty instructing students',
  },
  'Hotels & Hospitality': {
    trade: 'Food & Cooking',
    imageUrl: serviceChefCookingImg,
    imageAlt: 'Hotel chefs and hospitality kitchen staff preparing meals',
  },
  'Shopping Malls & Retail': {
    trade: 'Logistics & Warehouse',
    imageUrl: serviceRetailPantryImg,
    imageAlt: 'Shopping mall retail floor merchandisers stocking shelves',
  },
  'Manufacturing & Industrial': {
    trade: 'Construction & Maintenance',
    imageUrl: serviceManufacturingOpsImg,
    imageAlt: 'Manufacturing assembly line and carton inspection crew',
  },
  'Logistics & Transportation': {
    trade: 'Vehicle & Transportation',
    imageUrl: serviceDeliveryFleetImg,
    imageAlt: 'Logistics delivery drivers and fleet dispatch crew',
  },
  'Construction & Real Estate': {
    trade: 'Construction & Maintenance',
    imageUrl: serviceElectricalPanelImg,
    imageAlt: 'Construction electricians, engineers and site technicians',
  },
  'Security & Facility Management': {
    trade: 'Security Services',
    imageUrl: serviceFacilityLogisticsImg,
    imageAlt: 'Security guards and facility management crew',
  },
  'Events & Temporary Workforce': {
    trade: 'Events & Entertainment',
    imageUrl: serviceEventsCrewImg,
    imageAlt: 'Event crew preparing seating and stage equipment',
  },
  'IT & Digital Professionals': {
    trade: 'IT & Digital Services',
    imageUrl: serviceItProfessionalImg,
    imageAlt: 'Software engineers and UI/UX designers collaborating',
  },
};

const SUBSCRIPTION_TIERS = [
  {
    name: 'Single Hub Plan',
    audience: 'For Single Warehouses & Stores',
    monthlyFee: 4999,
    limitSummary: 'Up to 25 active workers / day · 1 metro site',
    highlights: [
      'Same-day picker, packer, guard & housekeeping dispatch',
      'Digital attendance check-in & OTP completion logs',
      'Automated consolidated monthly GST tax invoice',
    ],
    recommended: false,
  },
  {
    name: 'Multi-Site Operations',
    audience: 'For Multi-Site Operations & Hospitals',
    monthlyFee: 14999,
    limitSummary: 'Up to 150 active workers / day · 5 metro sites',
    highlights: [
      'Priority surge pool across Bengaluru, Mumbai, NCR & Hyderabad',
      'Daily, night-shift, part-time & contract roster replication',
      'Zero worker replacement surcharge within 2 hours',
    ],
    recommended: true,
  },
  {
    name: 'Enterprise Partner',
    audience: 'For Enterprise Partners & Manufacturers',
    monthlyFee: 34999,
    limitSummary: 'Unlimited bulk worker postings · Dedicated SLA lead',
    highlights: [
      'Custom contract-based, project & temporary crew scaling',
      'Multi-GSTIN billing & 30-day enterprise credit line',
      'Dedicated verification desk & safety audit compliance',
    ],
    recommended: false,
  },
];

export const BusinessDashboardView: React.FC<BusinessDashboardViewProps> = ({
  selectedCity,
  businessRequirements,
  verificationQueue,
  onCreateRequirement,
  onCheckInWorkers,
  onResolveVerification,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<BusinessHubTab>('workforce');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('Multi-Site Operations');

  // Bulk Workforce Post Form State
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState<B2BIndustry>('Warehouse & E-commerce');
  const [roleTitle, setRoleTitle] = useState('');
  const [city, setCity] = useState(selectedCity);
  const [workersRequested, setWorkersRequested] = useState(15);
  const [workFormat, setWorkFormat] = useState<WorkFormat>('Daily Jobs');
  const [shiftDate, setShiftDate] = useState('Today');
  const [shiftBucket, setShiftBucket] = useState<ShiftBucket>('Morning');
  const [payoutPerWorker, setPayoutPerWorker] = useState(750);
  const [formError, setFormError] = useState('');
  const [postSuccess, setPostSuccess] = useState('');

  const kpis = useMemo(() => {
    const totalRequested = businessRequirements.reduce(
      (sum, r) => sum + r.workersRequested,
      0
    );
    const totalConfirmed = businessRequirements.reduce(
      (sum, r) => sum + r.workersConfirmed,
      0
    );
    const totalCheckedIn = businessRequirements.reduce(
      (sum, r) => sum + r.workersCheckedIn,
      0
    );
    const totalEstimatedSpend = businessRequirements.reduce(
      (sum, r) => sum + r.workersRequested * r.payoutPerWorker,
      0
    );
    return {
      activeOrders: businessRequirements.length,
      totalRequested,
      totalConfirmed,
      totalCheckedIn,
      totalEstimatedSpend,
    };
  }, [businessRequirements]);

  const pendingVerificationCount = useMemo(
    () => verificationQueue.filter((v) => v.status === 'Pending').length,
    [verificationQueue]
  );

  const handleBulkPostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setFormError('Enter your company or facility name.');
      return;
    }
    if (!roleTitle.trim()) {
      setFormError('Specify the job role (e.g., Warehouse Pickers & Packers).');
      return;
    }
    if (workersRequested < 1 || workersRequested > 500) {
      setFormError('Worker headcount must be between 1 and 500.');
      return;
    }

    setFormError('');
    const reqNum = Math.floor(410 + Math.random() * 580);
    const reqId = `B2B-REQ-${reqNum}`;
    const invoiceId = `INV-2026-${Math.floor(8850 + Math.random() * 900)}`;

    const shiftWindowMap: Record<ShiftBucket, string> = {
      Morning: '8:00 AM – 4:00 PM',
      Afternoon: '1:00 PM – 9:00 PM',
      Evening: '5:00 PM – 11:00 PM',
      Night: '10:00 PM – 6:00 AM',
    };

    const meta = INDUSTRY_TRADE_IMAGE[industry];
    const cityCoords =
      CITY_HUB_CENTERS[city] ?? CITY_HUB_CENTERS['Bengaluru · Indiranagar'];

    const newRequirement: BusinessRequirement = {
      id: reqId,
      companyName: companyName.trim(),
      industry,
      roleTitle: roleTitle.trim(),
      city,
      workersRequested,
      workersConfirmed: Math.max(1, Math.min(workersRequested, Math.floor(workersRequested * 0.25))),
      workersCheckedIn: 0,
      workFormat,
      shiftWindow: `${shiftDate} · ${shiftWindowMap[shiftBucket]}`,
      payoutPerWorker,
      status: 'Recruiting',
      gstInvoiceId: invoiceId,
    };

    const newShift: JobShift = {
      id: `job-b2b-${reqNum}`,
      title: `${roleTitle.trim()} (${industry})`,
      segment: 'B2B',
      trade: meta.trade,
      industry,
      workFormat,
      employer: companyName.trim(),
      city,
      locality: `${city.split('·')[1]?.trim() ?? 'Central'} Operations Zone`,
      distanceKm: 2.8,
      etaMinutes: 16,
      shiftDate,
      shiftBucket,
      shiftWindow: shiftWindowMap[shiftBucket],
      durationHours: 8,
      basePay: payoutPerWorker,
      surgeBonus: workersRequested >= 25 ? 150 : 0,
      totalPayout: payoutPerWorker + (workersRequested >= 25 ? 150 : 0),
      urgency: workersRequested >= 25 ? 'Urgent Fill' : 'Standard',
      instantEscrow: true,
      credentialsRequired: ['Govt ID Verified', `${industry} Safety Briefing`],
      brief: `${workFormat} workforce requirement posted via ZEVRO Workforce for ${workersRequested} workers at ${companyName.trim()}.`,
      slotsRemaining: workersRequested,
      workersNeededToday: workersRequested,
      workersAssignedToday: newRequirement.workersConfirmed,
      hubCoords: cityCoords.hub,
      siteCoords: cityCoords.defaultSite,
      imageUrl: meta.imageUrl,
      imageAlt: meta.imageAlt,
    };

    onCreateRequirement(newRequirement, newShift);
    setPostSuccess(
      `Published ${reqId}: ${workersRequested} ${roleTitle.trim()} slots now live in Find Work.`
    );
    setCompanyName('');
    setRoleTitle('');
    setActiveTab('workforce');
  };

  const activeInvoiceReq =
    businessRequirements.find((r) => r.id === selectedInvoiceId) ?? null;

  return (
    <div className="mt-8 space-y-6">
      {/* B2B Command Header Banner */}
      <section className="rounded-2xl border border-[#e4e4e7] bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.06em] text-[#e23744] uppercase">
              ZEVRO Workforce · Business Solutions &amp; Hire Workers
            </p>
            <h2 className="font-display mt-1 text-2xl font-extrabold tracking-[-0.02em] text-[#18181b]">
              Hire Verified Staff Across All 12 B2B Industries
            </h2>
            <p className="mt-1 text-sm text-[#52525b]">
              Post bulk shifts (1–500 workers), manage shift attendance &amp; GST billing, inspect connected B2C/B2B talent, and process verifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('post')}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#e23744] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#be123c] whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Hire Workers (Bulk Post)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('jobs')}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] px-4 py-2 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] whitespace-nowrap cursor-pointer"
            >
              <span>Open Find Work Board</span>
            </button>
          </div>
        </div>

        {/* Top 4-Column KPI Strip */}
        <div className="mt-6 grid grid-cols-2 divide-y divide-[#e4e4e7] rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <p className="text-xs font-semibold text-[#71717a]">Active B2B Orders</p>
            <p className="font-mono mt-1 text-2xl font-extrabold text-[#18181b] tabular-nums">
              {kpis.activeOrders}
            </p>
            <p className="mt-0.5 text-xs text-[#52525b]">12 B2B industry verticals</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-[#71717a]">Workers Requested</p>
            <p className="font-mono mt-1 text-2xl font-extrabold text-[#18181b] tabular-nums">
              {kpis.totalRequested}
            </p>
            <p className="mt-0.5 text-xs text-[#059669] tabular-nums">
              {kpis.totalConfirmed} confirmed in roster
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-[#71717a]">Checked-In Today</p>
            <p className="font-mono mt-1 text-2xl font-extrabold text-[#059669] tabular-nums">
              {kpis.totalCheckedIn}
            </p>
            <p className="mt-0.5 text-xs text-[#52525b]">OTP attendance verified</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-[#71717a]">Escrow Commitment</p>
            <p className="font-mono mt-1 text-2xl font-extrabold text-[#18181b] tabular-nums">
              ₹{kpis.totalEstimatedSpend.toLocaleString('en-IN')}
            </p>
            <p className="mt-0.5 text-xs text-[#52525b]">GST invoice ready</p>
          </div>
        </div>

        {/* Hub Sub-Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Business Hub Views"
          className="mt-6 flex flex-wrap items-center gap-1.5 rounded-xl bg-[#f4f4f5] p-1 w-fit"
        >
          {(
            [
              { id: 'workforce', label: 'Workforce & Attendance', icon: Users },
              { id: 'post', label: 'Hire Workers (Bulk)', icon: Building2 },
              { id: 'ecosystem', label: 'Connected B2C+B2B Roles', icon: Network },
              {
                id: 'verification',
                label: `Verification & Support (${pendingVerificationCount})`,
                icon: ShieldCheck,
              },
              { id: 'revenue', label: 'Revenue & Business Plans', icon: TrendingUp },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-[#be123c] shadow-xs'
                    : 'text-[#52525b] hover:text-[#18181b]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {postSuccess && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] px-4 py-3 text-xs font-semibold text-[#047857]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{postSuccess}</span>
          </span>
          <button
            type="button"
            onClick={() => onNavigate('jobs')}
            className="underline underline-offset-4 hover:text-[#18181b] shrink-0 cursor-pointer"
          >
            Inspect in Find Work
          </button>
        </div>
      )}

      {/* TAB 1: Workforce Roster, Attendance & GST Invoices */}
      {activeTab === 'workforce' && (
        <section className="rounded-2xl border border-[#e4e4e7] bg-white overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-[#e4e4e7] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-[#18181b]">
                Active Business Workforce Orders &amp; Shift Attendance
              </h3>
              <p className="text-xs text-[#52525b]">
                Mark live shift check-ins as workers report at site gates and download GST-ready breakdowns.
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-[#71717a] tabular-nums">
              {businessRequirements.length} active orders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-[#e4e4e7] bg-[#fcfbfa] text-xs font-semibold text-[#71717a]">
                <tr>
                  <th className="px-6 py-3.5">Order &amp; Enterprise</th>
                  <th className="px-4 py-3.5">Industry &amp; Job Type</th>
                  <th className="px-4 py-3.5">Shift Window</th>
                  <th className="px-4 py-3.5">Attendance (In / Conf / Req)</th>
                  <th className="px-4 py-3.5 text-right">Payout / Worker</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e4e7]">
                {businessRequirements.map((req) => {
                  const pct = Math.min(
                    100,
                    Math.round((req.workersCheckedIn / req.workersRequested) * 100)
                  );
                  return (
                    <tr key={req.id} className="hover:bg-[#fcfbfa]">
                      <td className="px-6 py-4">
                        <p className="font-mono text-xs font-semibold text-[#71717a]">
                          {req.id} · {req.city}
                        </p>
                        <p className="font-bold text-[#18181b]">{req.companyName}</p>
                        <p className="text-xs text-[#52525b]">{req.roleTitle}</p>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <p className="font-semibold text-[#e23744]">{req.industry}</p>
                        <p className="mt-0.5 text-[#52525b]">{req.workFormat}</p>
                      </td>
                      <td className="px-4 py-4 text-xs text-[#52525b]">
                        <p className="font-semibold text-[#18181b]">{req.shiftWindow}</p>
                        <p
                          className={`mt-0.5 font-semibold ${
                            req.status === 'Shift Active'
                              ? 'text-[#059669]'
                              : 'text-[#d97706]'
                          }`}
                        >
                          {req.status}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold tabular-nums">
                          <span className="text-[#059669]">{req.workersCheckedIn}</span>
                          <span className="text-[#a1a1aa]">/</span>
                          <span className="text-[#18181b]">{req.workersConfirmed}</span>
                          <span className="text-[#a1a1aa]">/</span>
                          <span className="text-[#71717a]">{req.workersRequested}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-[#f4f4f5]">
                          <div
                            className="h-full rounded-full bg-[#059669]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-bold text-[#18181b] tabular-nums">
                        ₹{req.payoutPerWorker.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={req.workersCheckedIn >= req.workersRequested}
                            onClick={() => onCheckInWorkers(req.id, 1)}
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#059669] bg-[#ecfdf5] px-2.5 py-1 text-xs font-semibold text-[#047857] hover:bg-[#d1fae5] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                          >
                            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Check In +1</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedInvoiceId(
                                selectedInvoiceId === req.id ? null : req.id
                              )
                            }
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1 text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] whitespace-nowrap cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>GST Invoice</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {activeInvoiceReq && (
            <div className="border-t border-[#e4e4e7] bg-[#fcfbfa] px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs font-bold text-[#e23744]">
                    {activeInvoiceReq.gstInvoiceId} · 5% Shift GST Tax Summary
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#18181b]">
                    {activeInvoiceReq.companyName} — {activeInvoiceReq.workersRequested} Workers × ₹
                    {activeInvoiceReq.payoutPerWorker.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-6 font-mono text-xs tabular-nums">
                  <div>
                    <p className="text-[#71717a]">Worker Escrow</p>
                    <p className="font-bold text-[#18181b]">
                      ₹
                      {(
                        activeInvoiceReq.workersRequested *
                        activeInvoiceReq.payoutPerWorker
                      ).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#71717a]">Platform Fee (5%)</p>
                    <p className="font-bold text-[#18181b]">
                      ₹
                      {Math.round(
                        activeInvoiceReq.workersRequested *
                          activeInvoiceReq.payoutPerWorker *
                          B2B_PLATFORM_FEE_RATE
                      ).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#71717a]">Shift GST (5%)</p>
                    <p className="font-bold text-[#059669]">
                      ₹
                      {Math.round(
                        activeInvoiceReq.workersRequested *
                          activeInvoiceReq.payoutPerWorker *
                          SHIFT_GST_RATE
                      ).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Bulk Workforce Requirement Publisher */}
      {activeTab === 'post' && (
        <section className="rounded-2xl border border-[#e4e4e7] bg-white p-6">
          <div className="border-b border-[#e4e4e7] pb-4">
            <h3 className="font-display text-lg font-bold text-[#18181b]">
              Hire Workers — Bulk Workforce Requirement (1–500 Staff)
            </h3>
            <p className="mt-1 text-xs text-[#52525b]">
              Publish requirements across all 12 B2B sectors (Offices, Warehouses, Hospitals, Schools, Hotels, Malls, Manufacturing, Logistics, Construction, Security, Events, IT) and all 12 Job Types.
            </p>
          </div>

          <form onSubmit={handleBulkPostSubmit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="b2b-company" className="block text-xs font-semibold text-[#52525b]">
                Company / Institution / Facility Name
              </label>
              <input
                id="b2b-company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Horizon Cold Chain Logistics or Metro Hospital"
                className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-sm text-[#18181b] focus:border-[#e23744] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="b2b-industry" className="block text-xs font-semibold text-[#52525b]">
                B2B Target Industry (All 12 Sectors)
              </label>
              <select
                id="b2b-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value as B2BIndustry)}
                className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-sm font-medium text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
              >
                {B2B_INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="b2b-role" className="block text-xs font-semibold text-[#52525b]">
                Job Role / Workforce Description
              </label>
              <input
                id="b2b-role"
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g., Pickers & Packers, Receptionists, Welders, Nurses"
                className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 text-sm text-[#18181b] focus:border-[#e23744] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="b2b-format" className="block text-xs font-semibold text-[#52525b]">
                Job Type (All 12 Flexible Formats)
              </label>
              <select
                id="b2b-format"
                value={workFormat}
                onChange={(e) => setWorkFormat(e.target.value as WorkFormat)}
                className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-sm font-medium text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
              >
                {WORK_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="b2b-city" className="block text-xs font-semibold text-[#52525b]">
                Operating City Hub
              </label>
              <select
                id="b2b-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-3 text-sm font-medium text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
              >
                {ZEVRO_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="b2b-headcount" className="block text-xs font-semibold text-[#52525b]">
                  Workers Needed
                </label>
                <input
                  id="b2b-headcount"
                  type="number"
                  min={1}
                  max={500}
                  value={workersRequested}
                  onChange={(e) => setWorkersRequested(Number(e.target.value) || 1)}
                  className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 font-mono text-sm font-bold text-[#18181b] tabular-nums focus:border-[#e23744] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="b2b-date" className="block text-xs font-semibold text-[#52525b]">
                  Start Day
                </label>
                <select
                  id="b2b-date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-2 text-xs font-semibold text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
                >
                  <option value="Today">Today</option>
                  <option value="Tomorrow">Tomorrow</option>
                  <option value="Tue, Nov 17">Tue, Nov 17</option>
                </select>
              </div>

              <div>
                <label htmlFor="b2b-bucket" className="block text-xs font-semibold text-[#52525b]">
                  Shift Block
                </label>
                <select
                  id="b2b-bucket"
                  value={shiftBucket}
                  onChange={(e) => setShiftBucket(e.target.value as ShiftBucket)}
                  className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-white px-2 text-xs font-semibold text-[#18181b] focus:border-[#e23744] focus:outline-none cursor-pointer"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="b2b-payout" className="block text-xs font-semibold text-[#52525b]">
                Guaranteed Payout per Worker (₹)
              </label>
              <input
                id="b2b-payout"
                type="number"
                min={400}
                step={50}
                value={payoutPerWorker}
                onChange={(e) => setPayoutPerWorker(Number(e.target.value) || 800)}
                className="mt-1.5 h-10 w-full rounded-lg border-[1.5px] border-[#e4e4e7] bg-[#fcfbfa] px-3 font-mono text-sm font-bold text-[#18181b] tabular-nums focus:border-[#e23744] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-end justify-between rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] px-4 py-2.5">
              <div>
                <p className="text-xs text-[#71717a]">Estimated Shift Escrow</p>
                <p className="font-mono text-lg font-extrabold text-[#18181b] tabular-nums">
                  ₹{(workersRequested * payoutPerWorker).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#e23744] px-5 py-2 text-xs font-bold text-white hover:bg-[#be123c] cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Publish Requirement</span>
              </button>
            </div>

            {formError && (
              <p className="md:col-span-2 text-xs font-semibold text-[#be123c]">
                {formError}
              </p>
            )}
          </form>
        </section>
      )}

      {/* TAB 3: How All Categories Connect (Unified B2C + B2B Ecosystem) */}
      {activeTab === 'ecosystem' && (
        <section className="rounded-2xl border border-[#e4e4e7] bg-white overflow-hidden">
          <div className="border-b border-[#e4e4e7] px-6 py-4">
            <h3 className="font-display text-lg font-bold text-[#18181b]">
              One Connected Worker Ecosystem — Same Skill, B2C &amp; B2B Ready
            </h3>
            <p className="mt-1 text-xs text-[#52525b]">
              Every professional registered on ZEVRO can accept individual household bookings (B2C) and corporate or institutional shifts (B2B) from one unified profile.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-[#e4e4e7] bg-[#fcfbfa] text-xs font-semibold text-[#71717a]">
                <tr>
                  <th className="px-6 py-3">Professional / Role</th>
                  <th className="px-4 py-3">B2C Customer (Individual)</th>
                  <th className="px-4 py-3">B2B Customer (Business)</th>
                  <th className="px-6 py-3">ZEVRO Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e4e7]">
                {CONNECTED_ECOSYSTEM_ROWS.map((row) => (
                  <tr key={row.professional} className="hover:bg-[#fcfbfa]">
                    <td className="px-6 py-3 font-bold text-[#18181b]">
                      {row.professional}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[#059669]">
                      {row.b2cCustomer}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[#e23744]">
                      {row.b2bCustomer}
                    </td>
                    <td className="px-6 py-3 text-xs text-[#52525b]">
                      {row.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: Admin Document Verification & Support Dispute Queue */}
      {activeTab === 'verification' && (
        <section className="rounded-2xl border border-[#e4e4e7] bg-white p-6">
          <div className="flex flex-col gap-2 border-b border-[#e4e4e7] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-[#18181b]">
                Platform Verification &amp; Support Operations Queue
              </h3>
              <p className="text-xs text-[#52525b]">
                Verify doctor/professional registrations, worker IDs, B2B GSTIN accounts, and customer support disputes.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#059669]">
              Primary Launch Hub: Bengaluru · Pan-India Ready
            </span>
          </div>

          <div className="mt-4 divide-y divide-[#e4e4e7]">
            {verificationQueue.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#71717a]">
                    <span className="font-mono text-[#18181b]">{item.id}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#e23744]">{item.accountType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.city}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.submittedAt}</span>
                  </div>
                  <p className="mt-1 font-bold text-[#18181b]">{item.applicantName}</p>
                  <p className="text-xs text-[#52525b]">{item.detail}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'Pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onResolveVerification(item.id, 'Approved')}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#059669] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#047857] cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveVerification(item.id, 'Flagged')}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#e4e4e7] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#be123c] hover:bg-[#fff1f2] cursor-pointer"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Flag</span>
                      </button>
                    </>
                  ) : (
                    <span
                      className={`font-mono text-xs font-bold ${
                        item.status === 'Approved' ? 'text-[#059669]' : 'text-[#be123c]'
                      }`}
                    >
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 5: Revenue Model & B2B Business Subscription Plans */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#e4e4e7] bg-white p-6">
            <h3 className="font-display text-lg font-bold text-[#18181b]">
              Transparent ZEVRO Marketplace Revenue Model
            </h3>
            <p className="mt-1 text-xs text-[#52525b]">
              Balanced unit economics across consumer service orders, professional consultations, B2B staffing, and enterprise plans.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] p-4">
                <p className="text-xs font-bold text-[#e23744] uppercase">
                  1. Consumer Service Commission
                </p>
                <p className="font-mono mt-2 text-2xl font-extrabold text-[#18181b] tabular-nums">
                  15% Split
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#52525b]">
                  Example: On a <strong className="text-[#18181b]">₹500</strong> customer service order,{' '}
                  <strong className="text-[#059669]">₹425</strong> goes to the worker and{' '}
                  <strong className="text-[#18181b]">₹75</strong> covers platform dispatch &amp; escrow protection.
                </p>
              </div>

              <div className="rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] p-4">
                <p className="text-xs font-bold text-[#059669] uppercase">
                  2. B2B Staffing Fee &amp; 5% Shift GST
                </p>
                <p className="font-mono mt-2 text-2xl font-extrabold text-[#18181b] tabular-nums">
                  5% Per Shift
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#52525b]">
                  Lowered platform fee &amp; 5% shift GST on warehouse, hospital, school, retail, manufacturing, and event placements with automated GST billing.
                </p>
              </div>

              <div className="rounded-xl border border-[#e4e4e7] bg-[#fcfbfa] p-4">
                <p className="text-xs font-bold text-[#d97706] uppercase">
                  3. Featured Partner Visibility
                </p>
                <p className="font-mono mt-2 text-2xl font-extrabold text-[#18181b] tabular-nums">
                  Optional Boost
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#52525b]">
                  Verified professionals and clinics can opt into priority search placement without restricting open worker access.
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const isSelected = selectedPlan === tier.name;
              return (
                <div
                  key={tier.name}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-6 ${
                    isSelected
                      ? 'border-[#e23744] ring-2 ring-[#e23744]/15'
                      : 'border-[#e4e4e7]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#e23744]">{tier.audience}</p>
                      {tier.recommended && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#059669]">
                          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                          Most Popular
                        </span>
                      )}
                    </div>
                    <h4 className="font-display mt-2 text-xl font-bold text-[#18181b]">
                      {tier.name}
                    </h4>
                    <p className="font-mono mt-2 text-2xl font-extrabold text-[#18181b] tabular-nums">
                      ₹{tier.monthlyFee.toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-[#71717a]"> / month</span>
                    </p>
                    <p className="mt-1.5 text-xs font-semibold text-[#52525b]">
                      {tier.limitSummary}
                    </p>

                    <ul className="mt-4 space-y-2 border-t border-[#e4e4e7] pt-4 text-xs text-[#52525b]">
                      {tier.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 text-[#059669] shrink-0" aria-hidden="true" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan(tier.name)}
                    className={`mt-6 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#e23744] text-white'
                        : 'border border-[#e4e4e7] bg-[#fcfbfa] text-[#18181b] hover:bg-[#f4f4f5]'
                    }`}
                  >
                    {isSelected ? 'Active Partner Tier' : `Select ${tier.name}`}
                  </button>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
};
