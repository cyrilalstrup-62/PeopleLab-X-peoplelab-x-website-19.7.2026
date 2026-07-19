import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Check, ChevronRight, CornerDownRight, 
  AlertTriangle, ShieldCheck, Zap, ArrowLeft
} from 'lucide-react';
import { Language } from '../../types';
import { trackEvent } from '../../utils/analytics';
import { generateTrackingContext, generateUUID, submitToAppsScript } from '../../utils/trackingContext';

interface RealityCheckIndikatorViewProps {
  lang: Language;
  onNavigateToContact: () => void;
  onNavigateToRealityCheck: () => void;
}

// Map Q1 options to human-readable Danish texts for Notion
const Q1_MAP: Record<string, string> = {
  'A': 'Vi får ikke nok relevante henvendelser',
  'B': 'Vi får interesse, men ikke nok beslutninger',
  'C': 'Vi overvejer nyt website, repositionering eller GTM',
  'D': 'Vi skal ind i et nyt marked eller segment',
  'E': 'Vi oplever pris-, konkurrence- eller relevanspres',
  'F': 'Vi er usikre på, hvordan markedet faktisk læser os',
  'G': 'Vi står foran en større kommerciel beslutning'
};

export default function RealityCheckIndikatorView({ 
  lang, 
  onNavigateToContact,
  onNavigateToRealityCheck
}: RealityCheckIndikatorViewProps) {
  
  // View states: 'landing' | 'flow' | 'submitting' | 'result'
  const [stage, setStage] = useState<'landing' | 'flow' | 'submitting' | 'result'>('landing');
  
  // Questions flow index: 0 to 6 (7 questions total)
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  // User selections
  const [q1, setQ1] = useState<string>('');
  const [q2, setQ2] = useState<number>(3); // 1-5 scale
  const [q3, setQ3] = useState<string[]>([]); // multi-select
  const [q4, setQ4] = useState<string>('');
  const [q5, setQ5] = useState<number>(3); // 1-5 scale
  const [q6, setQ6] = useState<string[]>([]); // multi-select
  const [q7, setQ7] = useState<string[]>([]); // multi-select

  // Contact form state
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [decisionText, setDecisionText] = useState<string>('');
  const [consent, setConsent] = useState<boolean>(false);
  
  // Validation and submit states
  const [formError, setFormError] = useState<string>('');
  const [apiResult, setApiResult] = useState<any>(null);
  const [followupSubmitted, setFollowupSubmitted] = useState<boolean>(false);
  const [isFollowupSubmitting, setIsFollowupSubmitting] = useState<boolean>(false);
  const [followupError, setFollowupError] = useState<string>('');

  const handleFollowup = async () => {
    if (isFollowupSubmitting || followupSubmitted) return;
    setIsFollowupSubmitting(true);
    setFollowupError('');
    
    trackEvent('indicator_followup_requested', { outputType: apiResult?.outputType });

    const parentId = apiResult?.submissionId || sessionStorage.getItem("plx_last_indicator_submission_id") || "";
    const followupSubmissionId = "plx-followup-" + generateUUID();

    try {
      if (!parentId) {
        setFollowupError(lang === 'da'
          ? 'Kunne ikke forbinde din anmodning med din indikatorbesvarelse. Prøv venligst at starte testen forfra.'
          : 'Could not connect your request with your indicator response. Please try restarting the test.');
        setIsFollowupSubmitting(false);
        return;
      }

      const submissionData = {
        parentSubmissionId: parentId,
        name: name || "",
        email: email || "",
        company: company || "",
        role: role || "",
        language: lang.toUpperCase(),
        outputType: apiResult?.outputType || "",
        problemklarhed: String(apiResult?.problemklarhed || ""),
        beslutningspres: String(apiResult?.beslutningspres || ""),
        internForsvarbarhed: String(apiResult?.internForsvarbarhed || ""),
        analysefit: String(apiResult?.analysefit || apiResult?.analyseFit || ""),
        analyseFit: String(apiResult?.analysefit || apiResult?.analyseFit || ""),
        reframeParathed: String(apiResult?.reframeParathed || ""),
        pageURL: window.location.href,
        followupRequested: "true",
        parentInquiryId: apiResult?.inquiryId || "",
        parentOpportunityId: apiResult?.opportunityId || "",
        opportunityId: apiResult?.opportunityId || "",
        followupType: lang === 'da' ? "Afklaringssamtale" : "Clarification Call"
      };

      const result = await submitToAppsScript(
        'indicator_followup',
        followupSubmissionId,
        lang === 'da' ? 'DA' : 'EN',
        submissionData,
        'indicator_request_followup',
        'Request Follow-up'
      );

      if (!result.success) {
        throw new Error(result.error || "Google Apps Script gateway failed to accept follow-up.");
      }

      setFollowupSubmitted(true);
    } catch (err: any) {
      console.error("Followup handler failed for formType: indicator_followup, submissionId:", followupSubmissionId, "Error details:", err);
      setFollowupError(lang === 'da'
        ? 'Der opstod en fejl under afsendelsen. Prøv venligst igen.'
        : 'An error occurred during submission. Please try again.');
    } finally {
      setIsFollowupSubmitting(false);
    }
  };

  // Trigger page view event on load
  React.useEffect(() => {
    trackEvent('indicator_landing_view');
  }, []);

  const startFlow = () => {
    trackEvent('indicator_start');
    setStage('flow');
    setCurrentStep(0);
  };

  const handleQ3Toggle = (optionId: string) => {
    if (optionId === 'H') {
      setQ3(['H']);
    } else {
      let updated = q3.filter(item => item !== 'H');
      if (updated.includes(optionId)) {
        updated = updated.filter(item => item !== optionId);
      } else {
        updated.push(optionId);
      }
      setQ3(updated);
    }
  };

  const handleQ6Toggle = (optionId: string) => {
    if (optionId === 'H') {
      setQ6(['H']);
    } else {
      let updated = q6.filter(item => item !== 'H');
      if (updated.includes(optionId)) {
        updated = updated.filter(item => item !== optionId);
      } else {
        updated.push(optionId);
      }
      setQ6(updated);
    }
  };

  const handleQ7Toggle = (optionId: string) => {
    if (q7.includes(optionId)) {
      setQ7(q7.filter(item => item !== optionId));
    } else {
      setQ7([...q7, optionId]);
    }
  };

  const nextStep = () => {
    trackEvent('indicator_step_complete', { step: currentStep + 1 });
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setStage('landing');
    }
  };

  // Submit flow data to backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError(lang === 'da' ? 'Venligst indtast dit navn.' : 'Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError(lang === 'da' ? 'Venligst indtast en gyldig arbejdsmail.' : 'Please enter a valid work email.');
      return;
    }
    if (!company.trim()) {
      setFormError(lang === 'da' ? 'Venligst indtast din virksomhed.' : 'Please enter your company.');
      return;
    }
    if (!consent) {
      setFormError(lang === 'da' ? 'Venligst giv samtykke til at modtage dit resultat.' : 'Please provide consent to receive your result.');
      return;
    }

    setStage('submitting');
    trackEvent('indicator_submit', { company, email });

    try {
      // Calculate scores and output type client-side so we don't rely on server response
      const problemklarhed = Math.min(5, Math.max(1, parseInt(String(q2)) || 1));
      const beslutningspres = Math.min(5, Math.max(1, parseInt(String(q5)) || 1));

      const selectedQ3 = Array.isArray(q3) ? q3 : (q3 ? [q3] : []);
      const selectedQ6 = Array.isArray(q6) ? q6 : (q6 ? [q6] : []);
      const selectedQ7 = Array.isArray(q7) ? q7 : (q7 ? [q7] : []);

      // Intern forsvarbarhed (1-5)
      const stakeholdersCount = selectedQ6.length;
      let internForsvarbarhed = 2;
      if (stakeholdersCount === 1) {
        internForsvarbarhed = 2;
      } else if (stakeholdersCount === 2) {
        internForsvarbarhed = 3;
      } else if (stakeholdersCount >= 3) {
        internForsvarbarhed = 4;
      }
      if (selectedQ6.includes('D') || selectedQ6.includes('E')) {
        internForsvarbarhed = Math.max(internForsvarbarhed, 5);
      } else if (selectedQ6.includes('F')) {
        internForsvarbarhed = Math.max(internForsvarbarhed, 4);
      }
      if (selectedQ6.length === 1 && selectedQ6[0] === 'H') {
        internForsvarbarhed = 2;
      }

      // Analysefit (1-5)
      let analysefit = 1;
      if (q4 === 'A') analysefit = 1;
      else if (q4 === 'B') analysefit = 2;
      else if (q4 === 'C') analysefit = 4;
      else if (q4 === 'D') analysefit = 5;
      else if (q4 === 'E') analysefit = 5;

      if (selectedQ7.includes('D') || selectedQ7.includes('E')) {
        analysefit = Math.min(5, analysefit + 1);
      }

      // Reframe-parathed (1-5)
      let reframeParathed = 1;
      if (q4 === 'A') reframeParathed = 1;
      else if (q4 === 'B') reframeParathed = 2;
      else if (q4 === 'C') reframeParathed = 4;
      else if (q4 === 'D') reframeParathed = 5;
      else if (q4 === 'E') reframeParathed = 4;

      if (selectedQ7.includes('B') || selectedQ7.includes('C')) {
        reframeParathed = Math.min(5, reframeParathed + 1);
      }
      if (selectedQ3.includes('H')) {
        reframeParathed = Math.min(5, reframeParathed + 1);
      }

      // Determine output type using exactly the original backend prioritisation logic
      let outputType = "Afklaringsbehov før løsning";
      if (beslutningspres >= 4 && analysefit >= 4) {
        outputType = "Beslutningspres kræver eksternt grundlag";
      } else if (internForsvarbarhed >= 4 && (q4 === 'E' || selectedQ3.includes('G'))) {
        outputType = "Værdi skal forstås og forsvares";
      } else if (q1 === 'C' || selectedQ7.includes('E')) {
        outputType = "Problemdefinition før investering";
      } else if (reframeParathed >= 4 && problemklarhed <= 3) {
        outputType = "Afklaringsbehov før løsning";
      } else if (beslutningspres <= 2 || analysefit <= 2) {
        outputType = "Tidlig afklaring og videre orientering";
      } else {
        outputType = "Afklaringsbehov før løsning";
      }

      const indicatorSubmissionId = "plx-indicator-" + generateUUID();
      sessionStorage.setItem("plx_last_indicator_submission_id", indicatorSubmissionId);

      // Create synthetic but recognizable opportunity id and outcome object matching the backend structure
      const syntheticOpportunityId = "OPP-" + Math.floor(100000 + Math.random() * 900000);
      const calculatedData = {
        opportunityId: syntheticOpportunityId,
        submissionId: indicatorSubmissionId,
        outputType: outputType,
        problemklarhed,
        beslutningspres,
        internForsvarbarhed,
        analysefit,
        reframeParathed
      };

      const payloadData = {
        name: name || "",
        email: email || "",
        company: company || "",
        role: role || "",
        q1: q1 || "",
        q1Value: q1 || "",
        q2: String(q2),
        q2Value: String(q2),
        q3: selectedQ3.join(","),
        q3Value: selectedQ3.join(","),
        q4: q4 || "",
        q4Value: q4 || "",
        q5: String(q5),
        q5Value: String(q5),
        q6: selectedQ6.join(","),
        q6Value: selectedQ6.join(","),
        q7: selectedQ7.join(","),
        q7Value: selectedQ7.join(","),
        decisionText: decisionText || "",
        consent: consent ? "true" : "false",
        pageURL: window.location.href,
        outputType: outputType,
        problemklarhed: String(problemklarhed),
        beslutningspres: String(beslutningspres),
        internForsvarbarhed: String(internForsvarbarhed),
        analysefit: String(analysefit),
        analyseFit: String(analysefit),
        reframeParathed: String(reframeParathed),
        opportunityId: syntheticOpportunityId,
        score: String(problemklarhed + beslutningspres + internForsvarbarhed + analysefit + reframeParathed)
      };

      // Successfully render the result dashboard with the correct calculated state immediately
      setApiResult(calculatedData);
      setStage('result');
      trackEvent('indicator_result_view', { outputType });
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Post the submission asynchronously in the background to Google Apps Script (non-blocking)
      submitToAppsScript(
        'indicator',
        indicatorSubmissionId,
        lang === 'da' ? 'DA' : 'EN',
        payloadData,
        'indicator_submit',
        'Submit Indicator'
      ).then(result => {
        if (!result.success) {
          console.error("Background submission failed for formType: indicator, submissionId:", indicatorSubmissionId, "Error details:", result.error);
        } else {
          console.log("Background submission succeeded for indicator:", indicatorSubmissionId);
        }
      }).catch(err => {
        console.error("Background submission failed for formType: indicator, submissionId:", indicatorSubmissionId, "Exception details:", err);
      });
    } catch (err: any) {
      console.error('Submission failed:', err);
      // Fallback in case of local rendering/calculation failures
      setFormError(err.message || 'Der opstod en fejl under gemningen af dine svar. Prøv venligst igen.');
    }
  };

  // Content for each question
  const questions = [
    {
      title: lang === 'da' ? 'Næste beslutning' : 'Next Decision',
      subtitle: lang === 'da' ? 'Hvilken situation ligner jeres mest?' : 'Which situation is most similar to yours?',
      helpText: lang === 'da' 
        ? 'Vælg den situation, der bedst beskriver det kommercielle pres eller den beslutning, I står med lige nu.'
        : 'Choose the situation that best describes the commercial pressure or decision you are facing right now.',
      type: 'single',
      options: [
        { id: 'A', textDa: 'Vi får ikke nok relevante henvendelser', textEn: 'We do not get enough relevant inquiries' },
        { id: 'B', textDa: 'Vi får interesse, men ikke nok beslutninger', textEn: 'We get interest, but not enough decisions' },
        { id: 'C', textDa: 'Vi overvejer nyt website, repositionering eller GTM', textEn: 'We are considering a new website, repositioning, or GTM' },
        { id: 'D', textDa: 'Vi skal ind i et nyt marked eller segment', textEn: 'We are entering a new market or segment' },
        { id: 'E', textDa: 'Vi oplever pris-, konkurrence- eller relevanspres', textEn: 'We experience price, competition, or relevance pressure' },
        { id: 'F', textDa: 'Vi er usikre på, hvordan markedet faktisk læser os', textEn: 'We are unsure how the market actually perceives us' },
        { id: 'G', textDa: 'Vi står foran en større kommerciel beslutning', textEn: 'We stand before a major commercial decision' }
      ]
    },
    {
      title: lang === 'da' ? 'Intern forståelse' : 'Internal Understanding',
      subtitle: lang === 'da' ? 'Hvor klart er problemet internt hos jer?' : 'How clear is the problem internally?',
      helpText: lang === 'da'
        ? 'Har I en fælles forståelse af, hvorfor markedet ikke reagerer stærkere — eller arbejder I stadig med flere mulige forklaringer?'
        : 'Do you have a shared understanding of why the market does not react more strongly — or are you still working with several possible explanations?',
      type: 'scale',
      minLabelDa: 'Flere mulige forklaringer', minLabelEn: 'Several possible explanations',
      maxLabelDa: 'Klar fælles diagnose', maxLabelEn: 'Clear shared diagnosis',
      options: [
        { val: 1, labelDa: 'Vi ser symptomer, men har ingen fælles forklaring', labelEn: 'We see symptoms, but have no shared explanation' },
        { val: 2, labelDa: 'Vi har flere mulige forklaringer', labelEn: 'We have several possible explanations' },
        { val: 3, labelDa: 'Vi har en foreløbig fælles forståelse', labelEn: 'We have a preliminary shared understanding' },
        { val: 4, labelDa: 'Vi er ret sikre på problemets årsag', labelEn: 'We are reasonably sure of the root cause' },
        { val: 5, labelDa: 'Vi har a klar fælles diagnose', labelEn: 'We have a clear shared diagnosis' }
      ]
    },
    {
      title: lang === 'da' ? 'Mulig friktion' : 'Possible Friction',
      subtitle: lang === 'da' ? 'Hvor tror I friktionen primært ligger?' : 'Where do you believe the friction primarily lies?',
      helpText: lang === 'da'
        ? 'Vælg den forklaring, der lige nu virker mest sandsynlig.'
        : 'Select the explanation that currently seems most likely.',
      type: 'multi',
      options: [
        { id: 'A', textDa: 'For lidt synlighed', textEn: 'Too little visibility' },
        { id: 'B', textDa: 'Website eller digital fremtoning', textEn: 'Website or digital presence' },
        { id: 'C', textDa: 'Kommunikation og budskaber', textEn: 'Communication and messaging' },
        { id: 'D', textDa: 'Positionering', textEn: 'Positioning' },
        { id: 'E', textDa: 'Salgsproces', textEn: 'Sales process' },
        { id: 'F', textDa: 'Dokumentation, cases eller troværdighed', textEn: 'Documentation, cases, or credibility' },
        { id: 'G', textDa: 'Værdien er svær at forklare eller forsvare internt hos kunden', textEn: 'The value is hard to explain or defend internally at the client' },
        { id: 'H', textDa: 'Vi er ikke sikre endnu', textEn: 'We are not sure yet' }
      ]
    },
    {
      title: lang === 'da' ? 'Næste behov' : 'Next Need',
      subtitle: lang === 'da' ? 'Hvad har I mest brug for lige nu?' : 'What do you need most right now?',
      helpText: lang === 'da'
        ? 'Vælg det svar, der bedst beskriver jeres næste behov — ikke nødvendigvis den løsning, I allerede overvejer.'
        : 'Choose the answer that best describes your next need — not necessarily the solution you are already considering.',
      type: 'single_q4',
      options: [
        { id: 'A', textDa: 'Mere eksekvering', textEn: 'More execution' },
        { id: 'B', textDa: 'Bedre kommunikation af det, vi allerede ved', textEn: 'Better communication of what we already know' },
        { id: 'C', textDa: 'At forstå hvorfor markedet ikke reagerer stærkere', textEn: 'To understand why the market does not react more strongly' },
        { id: 'D', textDa: 'Et eksternt beslutningsgrundlag før vi vælger løsning', textEn: 'An external decision basis before choosing a solution' },
        { id: 'E', textDa: 'At kunne forklare og forsvare næste kommercielle beslutning internt', textEn: 'To be able to explain and defend the next commercial decision internally' }
      ]
    },
    {
      title: lang === 'da' ? 'Vigtighed' : 'Importance',
      subtitle: lang === 'da' ? 'Hvor vigtig er situationen de næste 3–6 måneder?' : 'How important is the situation over the next 3–6 months?',
      helpText: lang === 'da'
        ? 'Handler det om en generel overvejelse — eller om en konkret beslutning, investering eller markedsbevægelse?'
        : 'Is it a general consideration — or a concrete decision, investment, or market move?',
      type: 'scale_q5',
      minLabelDa: 'Ikke presserende', minLabelEn: 'Not urgent',
      maxLabelDa: 'Strategisk vigtigt nu', maxLabelEn: 'Strategically important now',
      options: [
        { val: 1, labelDa: 'Interessant, men ikke vigtigt nu', labelEn: 'Interesting, but not important now' },
        { val: 2, labelDa: 'Noget vi bør forstå bedre', labelEn: 'Something we should understand better' },
        { val: 3, labelDa: 'Relevant for vores næste prioriteringer', labelEn: 'Relevant for our next priorities' },
        { val: 4, labelDa: 'Vigtigt for en konkret beslutning', labelEn: 'Important for a concrete decision' },
        { val: 5, labelDa: 'Kritisk for en større investering eller markedsbevægelse', labelEn: 'Critical for a major investment or market move' }
      ]
    },
    {
      title: lang === 'da' ? 'Målgruppe' : 'Target Audience',
      subtitle: lang === 'da' ? 'Hvem skal kunne bruge beslutningsgrundlaget?' : 'Who needs to be able to use the decision basis?',
      helpText: lang === 'da'
        ? 'Vælg de personer eller funktioner, der skal forstå, acceptere eller bruge grundlaget for næste skridt.'
        : 'Select the people or functions who must understand, accept, or use the foundation for the next step.',
      type: 'multi_q6',
      options: [
        { id: 'A', textDa: 'Ejerleder / CEO', textEn: 'Owner-manager / CEO' },
        { id: 'B', textDa: 'Salgsledelse', textEn: 'Sales leadership' },
        { id: 'C', textDa: 'Marketing / CMO', textEn: 'Marketing / CMO' },
        { id: 'D', textDa: 'Bestyrelse', textEn: 'Board of directors' },
        { id: 'E', textDa: 'Investor / PE', textEn: 'Investor / PE' },
        { id: 'F', textDa: 'Flere interne funktioner', textEn: 'Multiple internal functions' },
        { id: 'G', textDa: 'Ekstern partner eller bureau', textEn: 'External partner or agency' },
        { id: 'H', textDa: 'Det er ikke afklaret endnu', textEn: 'It is not clarified yet' }
      ]
    },
    {
      title: lang === 'da' ? 'Værdi af indikation' : 'Value of Indication',
      subtitle: lang === 'da' ? 'Hvad vil gøre indikationen værdifuld for jer?' : 'What would make this indication valuable to you?',
      helpText: lang === 'da'
        ? 'Vælg det udbytte, der vil være mest nyttigt som første skridt.'
        : 'Select the outcome that would be most useful as a first step.',
      type: 'multi_q7',
      options: [
        { id: 'A', textDa: 'At se om situationen kræver mere afklaring', textEn: 'To see if the situation requires more clarification' },
        { id: 'B', textDa: 'At forstå om vores nuværende forklaring er for snæver', textEn: 'To understand if our current explanation is too narrow' },
        { id: 'C', textDa: 'At vide hvad der bør undersøges, før vi vælger løsning', textEn: 'To know what should be investigated before we choose a solution' },
        { id: 'D', textDa: 'At vurdere om Reality Check er relevant som næste skridt', textEn: 'To assess if a Reality Check is relevant as a next step' },
        { id: 'E', textDa: 'At få bedre grundlag før vi investerer i website, GTM, branding, salg eller AI', textEn: 'To get a better basis before we invest in website, GTM, branding, sales, or AI' }
      ]
    }
  ];

  return (
    <div className="py-12 md:py-20 max-w-4xl mx-auto w-full px-6 flex-1 flex flex-col justify-center" id="view-reality-check-indikator">
      <AnimatePresence mode="wait">
        
        {/* ================= STAGE 1: LANDING ================= */}
        {stage === 'landing' && (
          <motion.div 
            key="landing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-12 text-left"
          >
            <div className="space-y-4 border-b border-brand-border pb-8">
              <span className="text-[10px] font-mono font-bold tracking-widest text-brand-accent uppercase block">
                {lang === 'da' ? 'FØRSTE SITUATIONSLÆSNING' : 'FIRST SITUATION READING'}
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-sans font-semibold text-brand-charcoal tracking-tight leading-[1.15]">
                {lang === 'da' ? 'Reality Check Indikator' : 'Reality Check Indicator'}
              </h1>
              <div className="text-base sm:text-lg md:text-xl text-brand-muted font-normal max-w-2xl leading-relaxed space-y-4">
                <p>
                  {lang === 'da' 
                    ? 'Svar på 7 korte spørgsmål. Jeres svar bruges til at give en første situationslæsning af, hvad der bør afklares før næste kommercielle beslutning.'
                    : 'Answer 7 short questions. Your answers will be used to provide a first situation reading of what should be clarified before your next commercial decision.'}
                </p>
                <p className="text-sm font-semibold text-brand-charcoal">
                  {lang === 'da'
                    ? 'Dette er ikke en fuld analyse. Det er en foreløbig indikation.'
                    : 'This is not a full analysis. It is a preliminary indication.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6 text-sm sm:text-base leading-relaxed text-brand-muted">
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button
                    onClick={startFlow}
                    className="px-6 py-3 bg-brand-accent hover:bg-brand-accent-dark text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 group cursor-pointer border-none"
                    id="btn-start-indicator"
                  >
                    <span>{lang === 'da' ? 'Start indikatoren' : 'Start the indicator'}</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </button>
                  <button
                    onClick={onNavigateToRealityCheck}
                    className="px-6 py-3 bg-transparent border border-brand-border text-brand-charcoal hover:bg-brand-card hover:border-brand-muted font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                    id="btn-read-about-rc"
                  >
                    <span>{lang === 'da' ? 'Se Reality Check ydelser' : 'Explore Reality Check Services'}</span>
                  </button>
                </div>
              </div>

              <div className="md:col-span-5">
                <div className="bg-brand-card border border-brand-border p-6 space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-brand-accent flex items-center gap-2">
                    <ShieldCheck size={16} />
                    <span>{lang === 'da' ? 'Fuld fortrolighed' : 'Executive Privacy'}</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-brand-muted">
                    <li className="flex items-start gap-1.5">
                      <span className="text-brand-accent font-bold">•</span>
                      <span>{lang === 'da' ? 'Ingen offentliggørelse eller deling af svar.' : 'No public display or sharing of responses.'}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-brand-accent font-bold">•</span>
                      <span>{lang === 'da' ? 'Indsigterne bruges udelukkende til jeres skræddersyede rapport.' : 'Insights are used exclusively for your custom evaluation.'}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-brand-accent font-bold">•</span>
                      <span>{lang === 'da' ? 'Mulighed for direkte personlig uddybning.' : 'Optional personal review with our lead advisor.'}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= STAGE 2: WIZARD FLOW ================= */}
        {stage === 'flow' && (
          <motion.div 
            key="flow"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Minimalist executive step indicator */}
            {currentStep < 7 && (
              <div className="flex items-center justify-between border-b border-brand-border pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-brand-muted uppercase">
                    {lang === 'da' ? `TRIN ${currentStep + 1} AF 7` : `STEP ${currentStep + 1} OF 7`}
                  </span>
                  <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-brand-accent">
                    {questions[currentStep].title}
                  </h3>
                </div>
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-brand-muted hover:text-brand-accent uppercase tracking-wider bg-transparent border-none cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  <span>{lang === 'da' ? 'Tilbage' : 'Back'}</span>
                </button>
              </div>
            )}

            {/* Questions Form Logic */}
            {currentStep < 7 ? (
              <div className="space-y-6 text-left">
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-sans font-medium text-brand-charcoal tracking-tight leading-snug">
                    {questions[currentStep].subtitle}
                  </h2>
                  {questions[currentStep].helpText && (
                    <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-sans">
                      {questions[currentStep].helpText}
                    </p>
                  )}
                </div>

                {/* --- SINGLE CHOICE TYPE (Q1 and Q4) --- */}
                {(questions[currentStep].type === 'single' || questions[currentStep].type === 'single_q4') && (
                  <div className="space-y-3">
                    {questions[currentStep].options.map((opt) => {
                      const text = lang === 'da' ? opt.textDa : opt.textEn;
                      const selected = currentStep === 0 ? q1 === opt.id : q4 === opt.id;
                      const selectFn = () => {
                        if (currentStep === 0) setQ1(opt.id);
                        else setQ4(opt.id);
                      };

                      return (
                        <button
                          key={opt.id}
                          onClick={() => { selectFn(); setTimeout(nextStep, 150); }}
                          className={`w-full text-left p-4 rounded-none border transition-all flex items-start gap-4 cursor-pointer group ${
                            selected 
                              ? 'bg-brand-accent-light border-brand-accent text-brand-accent' 
                              : 'bg-white border-brand-border hover:border-brand-muted text-brand-charcoal'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full border text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            selected 
                              ? 'bg-brand-accent border-brand-accent text-white font-extrabold' 
                              : 'bg-brand-bg border-brand-border text-brand-muted group-hover:border-brand-muted'
                          }`}>
                            {opt.id}
                          </span>
                          <span className="text-xs sm:text-sm font-sans leading-relaxed">
                            {text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* --- SCALE TYPE (Q2 and Q5) --- */}
                {(questions[currentStep].type === 'scale' || questions[currentStep].type === 'scale_q5') && (
                  <div className="space-y-8 py-4">
                    <div className="grid grid-cols-5 gap-2 sm:gap-4 max-w-xl mx-auto">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const active = currentStep === 1 ? q2 === val : q5 === val;
                        const clickFn = () => {
                          if (currentStep === 1) setQ2(val);
                          else setQ5(val);
                        };

                        return (
                          <button
                            key={val}
                            onClick={clickFn}
                            className={`aspect-square sm:p-4 rounded-none border text-base sm:text-xl font-mono font-bold flex flex-col items-center justify-center cursor-pointer transition-all ${
                              active 
                                ? 'bg-brand-accent border-brand-accent text-white shadow-sm' 
                                : 'bg-white border-brand-border text-brand-muted hover:border-brand-muted hover:bg-brand-bg'
                            }`}
                          >
                            <span>{val}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Labels explaining the range */}
                    <div className="flex items-center justify-between max-w-xl mx-auto text-[10px] sm:text-xs font-mono text-brand-muted uppercase tracking-wider">
                      <span>{lang === 'da' ? questions[currentStep].minLabelDa : questions[currentStep].minLabelEn}</span>
                      <span>{lang === 'da' ? questions[currentStep].maxLabelDa : questions[currentStep].maxLabelEn}</span>
                    </div>

                    {/* Selected Scale Option Description */}
                    <div className="bg-brand-card/60 border border-brand-border p-4 max-w-xl mx-auto">
                      <p className="text-xs sm:text-sm text-brand-charcoal text-center font-sans font-medium">
                        {(questions[currentStep].options as any[]).find(o => (currentStep === 1 ? q2 : q5) === o.val)?.[lang === 'da' ? 'labelDa' : 'labelEn']}
                      </p>
                    </div>

                    <div className="flex justify-center pt-2">
                      <button
                        onClick={nextStep}
                        className="px-6 py-2.5 bg-brand-accent hover:bg-brand-accent-dark text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border-none"
                      >
                        {lang === 'da' ? 'Fortsæt' : 'Continue'}
                      </button>
                    </div>
                  </div>
                )}

                {/* --- MULTI-SELECT TYPE (Q3, Q6, Q7) --- */}
                {(questions[currentStep].type === 'multi' || questions[currentStep].type === 'multi_q6' || questions[currentStep].type === 'multi_q7') && (
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      {questions[currentStep].options.map((opt) => {
                        const text = lang === 'da' ? opt.textDa : opt.textEn;
                        
                        let isSelected = false;
                        if (currentStep === 2) isSelected = q3.includes(opt.id);
                        else if (currentStep === 5) isSelected = q6.includes(opt.id);
                        else if (currentStep === 6) isSelected = q7.includes(opt.id);

                        const toggleFn = () => {
                          if (currentStep === 2) handleQ3Toggle(opt.id);
                          else if (currentStep === 5) handleQ6Toggle(opt.id);
                          else if (currentStep === 6) handleQ7Toggle(opt.id);
                        };

                        return (
                          <button
                            key={opt.id}
                            onClick={toggleFn}
                            className={`w-full text-left p-4 border transition-all flex items-start gap-4 cursor-pointer group rounded-none ${
                              isSelected 
                                ? 'bg-brand-accent-light border-brand-accent text-brand-accent font-medium' 
                                : 'bg-white border-brand-border hover:border-brand-muted text-brand-charcoal'
                            }`}
                          >
                            <div className={`w-5 h-5 border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isSelected 
                                ? 'bg-brand-accent border-brand-accent text-white' 
                                : 'bg-brand-bg border-brand-border text-transparent group-hover:border-brand-muted'
                            }`}>
                              <Check size={12} className={isSelected ? 'block' : 'hidden'} />
                            </div>
                            <span className="text-xs sm:text-sm leading-relaxed font-sans">
                              {text}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-brand-border">
                      <button
                        onClick={nextStep}
                        disabled={currentStep === 2 ? q3.length === 0 : currentStep === 5 ? q6.length === 0 : q7.length === 0}
                        className="px-6 py-3 bg-brand-accent hover:bg-brand-accent-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center gap-2"
                      >
                        <span>{lang === 'da' ? 'Næste trin' : 'Next Step'}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              
              // ================= WIZARD SUB-STEP 8: CONTACT FORM =================
              <div className="space-y-8 text-left max-w-xl mx-auto">
                <div className="space-y-2 border-b border-brand-border pb-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono font-bold tracking-widest text-brand-muted uppercase">
                      {lang === 'da' ? 'FØRSTE SITUATIONSLÆSNING' : 'FIRST SITUATION READING'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-sans font-medium text-brand-charcoal tracking-tight">
                      {lang === 'da' ? 'Få jeres første situationslæsning' : 'Get your first situation reading'}
                    </h2>
                  </div>
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-brand-muted hover:text-brand-accent uppercase tracking-wider bg-transparent border-none cursor-pointer"
                  >
                    <ArrowLeft size={12} />
                    <span>{lang === 'da' ? 'Tilbage' : 'Back'}</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-sans">
                  {lang === 'da'
                    ? 'Udfyld kontaktoplysningerne, så vi kan gemme jeres svar og sende den foreløbige situationslæsning. Den viser, hvad der bør afklares som næste skridt — ikke en fuld Reality Check-analyse.'
                    : 'Fill in your contact information so we can save your answers and send your preliminary situation reading. It shows what should be clarified as a next step — not a full Reality Check analysis.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {formError && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-600 text-red-800 text-xs sm:text-sm font-sans flex items-start gap-2.5">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-muted block">
                        {lang === 'da' ? 'Navn *' : 'Name *'}
                      </label>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="f.eks. Michael Jensen"
                        className="w-full bg-white border border-brand-border focus:border-brand-accent focus:outline-none px-4 py-3 text-sm font-sans"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-muted block">
                        {lang === 'da' ? 'Arbejdsmail *' : 'Work email *'}
                      </label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="f.eks. mj@virksomhed.dk"
                        className="w-full bg-white border border-brand-border focus:border-brand-accent focus:outline-none px-4 py-3 text-sm font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-muted block">
                        {lang === 'da' ? 'Virksomhed *' : 'Company *'}
                      </label>
                      <input 
                        type="text" 
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="f.eks. Virksomhed A/S"
                        className="w-full bg-white border border-brand-border focus:border-brand-accent focus:outline-none px-4 py-3 text-sm font-sans"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-muted block">
                        {lang === 'da' ? 'Rolle *' : 'Role *'}
                      </label>
                      <input 
                        type="text" 
                        required
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="f.eks. CEO"
                        className="w-full bg-white border border-brand-border focus:border-brand-accent focus:outline-none px-4 py-3 text-sm font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-muted block">
                      {lang === 'da' ? 'Hvilken beslutning står I overfor?' : 'What decision are you facing?'}
                    </label>
                    <p className="text-[11px] text-brand-muted font-sans leading-relaxed">
                      {lang === 'da'
                        ? 'Skriv kort, hvis der er en konkret beslutning, investering eller markedsbevægelse, der gør indikationen relevant.'
                        : 'Write briefly if there is a concrete decision, investment, or market move making the indication relevant.'}
                    </p>
                    <textarea 
                      rows={3}
                      value={decisionText}
                      onChange={(e) => setDecisionText(e.target.value)}
                      placeholder={lang === 'da' 
                        ? 'Fx nyt website, ny GTM, lav konvertering, repositionering, nyt marked eller intern beslutning om næste kommercielle skridt.' 
                        : 'E.g., new website, new GTM, low conversion, repositioning, new market, or internal decision on next commercial step.'}
                      className="w-full bg-white border border-brand-border focus:border-brand-accent focus:outline-none p-4 text-sm font-sans resize-none"
                    />
                  </div>

                  {/* GDPR Consent */}
                  <div className="space-y-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setConsent(!consent)}
                      className="flex items-start gap-3 w-full text-left bg-transparent border-none p-0 cursor-pointer group"
                    >
                      <div className={`w-5 h-5 border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        consent 
                          ? 'bg-brand-accent border-brand-accent text-white' 
                          : 'bg-white border-brand-border text-transparent group-hover:border-brand-muted'
                      }`}>
                        <Check size={12} className={consent ? 'block' : 'hidden'} />
                      </div>
                      <span className="text-[11px] sm:text-xs text-brand-muted leading-relaxed font-sans">
                        {lang === 'da' 
                          ? 'Jeg accepterer, at PeopleLab X udarbejder en foreløbig situationslæsning og sender denne samt faglige indsigter relateret til kommercielle beslutninger til mig på mail.'
                          : 'I agree that PeopleLab X can prepare a preliminary situation reading and send this, alongside expert insights about commercial decisions, to my email address.'}
                      </span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-brand-border flex justify-end">
                    <button
                      type="submit"
                      className="px-8 py-3.5 bg-brand-accent hover:bg-brand-accent-dark text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                      <span>{lang === 'da' ? 'Se første situationslæsning' : 'See first situation reading'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}

        {/* ================= STAGE 3: SUBMITTING / CALCULATING ================= */}
        {stage === 'submitting' && (
          <motion.div 
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-6 py-12"
          >
            <div className="w-12 h-12 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1.5">
              <h2 className="text-lg font-mono font-bold uppercase tracking-widest text-brand-accent">
                {lang === 'da' ? 'UDARBEJDER SITUATIONSLÆSNING...' : 'PREPARING SITUATION READING...'}
              </h2>
              <p className="text-xs sm:text-sm text-brand-muted max-w-sm mx-auto font-sans">
                {lang === 'da'
                  ? 'Vi analyserer jeres svar for at fastlægge jeres foreløbige situationslæsning.'
                  : 'We are analyzing your inputs to establish your preliminary situation reading.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* ================= STAGE 4: EXECUTIVE RESULT DASHBOARD ================= */}
        {stage === 'result' && apiResult && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 text-left"
          >
            {/* Top Header */}
            <div className="border-b border-brand-border pb-8 space-y-3 max-w-3xl mx-auto">
              <span className="text-[10px] font-mono font-bold tracking-widest text-brand-accent uppercase bg-brand-accent-light px-3 py-1 block w-fit">
                {lang === 'da' ? 'Første situationslæsning' : 'First Situation Reading'}
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-sans font-semibold text-brand-charcoal tracking-tight leading-snug">
                {lang === 'da' 
                  ? 'Jeres svar peger på et afklaringsspor, der kan være relevant før næste kommercielle beslutning.'
                  : 'Your answers point to a clarification track that might be relevant before your next commercial decision.'}
              </h1>
            </div>

            {/* Pristine Executive Result Card */}
            <div className="bg-brand-card border border-brand-border p-6 sm:p-10 space-y-8 max-w-3xl mx-auto shadow-sm">
              
              {/* 1. Label and 2. Situationsoverskrift */}
              <div className="space-y-2 pb-6 border-b border-brand-border/60">
                <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-brand-accent uppercase block">
                  {lang === 'da' ? 'Første situationslæsning' : 'First Situation Reading'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-sans font-semibold text-brand-charcoal tracking-tight">
                  {lang === 'da' ? apiResult.outputType : (
                    apiResult.outputType === 'Afklaringsbehov før løsning' ? 'Need for Clarification Before Solution' :
                    apiResult.outputType === 'Problemdefinition før investering' ? 'Problem Definition Before Investment' :
                    apiResult.outputType === 'Værdi skal forstås og forsvares' ? 'Value Must Be Understood and Defended' :
                    apiResult.outputType === 'Beslutningspres kræver eksternt grundlag' ? 'Urgent Decision Requires External Basis' :
                    'Early Clarification and Future Orientation'
                  )}
                </h2>
                <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">
                  {lang === 'da' 
                    ? `UDARBEJDET FOR ${company.toUpperCase()} • ${new Date().toLocaleDateString('da-DK')}`
                    : `PREPARED FOR ${company.toUpperCase()} • ${new Date().toLocaleDateString('en-US')}`}
                </p>
              </div>

              {/* Intro message */}
              <div className="text-sm sm:text-base text-brand-muted leading-relaxed font-sans pb-4 border-b border-brand-border/40">
                <p className="font-semibold text-brand-charcoal">
                  {lang === 'da' 
                    ? 'Jeres svar peger på et afklaringsspor, der kan være relevant før næste kommercielle beslutning.'
                    : 'Your answers point to a clarification track that might be relevant before your next commercial decision.'}
                </p>
              </div>

              {/* 3. Brødtekst */}
              <div className="text-sm sm:text-base text-brand-muted leading-relaxed space-y-5 font-sans">
                {apiResult.outputType === 'Afklaringsbehov før løsning' && (
                  <p>
                    {lang === 'da'
                      ? 'Jeres svar peger på en situation, hvor der er kommerciel friktion, men hvor årsagen ikke bør låses for tidligt. Før næste løsning vælges, kan det være værd at undersøge, hvor markedet mister forståelse, tillid eller relevans.'
                      : 'Your answers point to a situation with commercial friction, but where the root cause should not be locked in too early. Before choosing the next solution, it may be worth investigating where the market loses understanding, trust, or relevance.'}
                  </p>
                )}

                {apiResult.outputType === 'Problemdefinition før investering' && (
                  <p>
                    {lang === 'da'
                      ? 'Jeres svar peger på, at I overvejer et konkret kommercielt skridt. Det kan være rigtigt. Men før investeringen låses, bør problemdefinitionen testes udefra, så I ikke forbedrer det synlige udtryk uden at løse den friktion, der faktisk påvirker markedets beslutning.'
                      : 'Your answers point to you considering a concrete commercial step. This might be correct. But before locking in the investment, the problem definition should be tested from the outside, so you do not improve the visual expression without solving the friction actually affecting the market\'s decision.'}
                  </p>
                )}

                {apiResult.outputType === 'Værdi skal forstås og forsvares' && (
                  <p>
                    {lang === 'da'
                      ? 'Jeres svar peger på en situation, hvor værdien ikke kun skal forstås af én person. Den skal kunne forklares, begrundes og forsvares overfor flere beslutningstagere. I B2B tabes muligheder ofte ikke på interesse alene, men fordi værdien ikke bliver let nok at bære videre internt.'
                      : 'Your answers point to a situation where the value must not only be understood by a single person. It must be explainable, justified, and defensible to multiple decision-makers. In B2B, opportunities are rarely lost on interest alone, but because the value is not easy enough to carry forward internally.'}
                  </p>
                )}

                {apiResult.outputType === 'Beslutningspres kræver eksternt grundlag' && (
                  <p>
                    {lang === 'da'
                      ? 'Jeres svar peger på en situation, hvor næste kommercielle beslutning har betydning for retning, investering eller markedsbevægelse. I den type situation er interne antagelser sjældent nok. Det afgørende er at forstå, hvordan virksomheden faktisk læses udefra, før næste skridt vælges.'
                      : 'Your answers point to a situation where the next commercial decision has significance for direction, investment, or market move. In this type of situation, internal assumptions are rarely enough. The crucial part is understanding how your company is actually read from the outside before the next step is chosen.'}
                  </p>
                )}

                {apiResult.outputType === 'Tidlig afklaring og videre orientering' && (
                  <p>
                    {lang === 'da'
                      ? 'Jeres svar peger på, at situationen stadig er i en tidlig afklaringsfase. Det betyder ikke, at problemet er uvigtigt. Det betyder, at næste skridt bør være at forstå situationen skarpere, før der træffes beslutning om analyse, investering eller eksekvering.'
                      : 'Your answers point to the situation still being in an early clarification phase. This does not mean the problem is unimportant. It means the next step should be to understand the situation more sharply before making any decision on analysis, investment, or execution.'}
                  </p>
                )}
              </div>

              {/* 4. Næste skridt */}
              <div className="bg-brand-accent-light/30 border border-brand-border p-6 space-y-4">
                <h4 className="text-sm font-sans font-semibold text-brand-accent flex items-center gap-2">
                  <Zap size={16} className="text-brand-accent shrink-0" />
                  <span>{lang === 'da' ? 'Næste skridt' : 'Next Step'}</span>
                </h4>
                
                <p className="text-xs sm:text-sm text-brand-charcoal font-sans leading-relaxed">
                  {apiResult.outputType === 'Afklaringsbehov før løsning' && (
                    lang === 'da'
                      ? 'Reality Check kan bruges til at afklare, hvor friktionen opstår, før I investerer i næste løsning.'
                      : 'A Reality Check can be used to clarify where the friction occurs before you invest in your next solution.'
                  )}
                  {apiResult.outputType === 'Problemdefinition før investering' && (
                    lang === 'da'
                      ? 'Reality Check kan give et eksternt beslutningsgrundlag, før næste investering vælges.'
                      : 'A Reality Check can provide an external decision basis before the next investment is chosen.'
                  )}
                  {apiResult.outputType === 'Værdi skal forstås og forsvares' && (
                    lang === 'da'
                      ? 'Reality Check kan undersøge, om jeres værdi er tydelig nok til at blive forstået, dokumenteret og forsvaret i den beslutningsproces, hvor valget faktisk formes.'
                      : 'A Reality Check can investigate whether your value is clear enough to be understood, documented, and defended in the decision-making process where the choice is actually shaped.'
                  )}
                  {apiResult.outputType === 'Beslutningspres kræver eksternt grundlag' && (
                    lang === 'da'
                      ? 'Reality Check kan bruges som et afgrænset beslutningsgrundlag før næste kommercielle valg.'
                      : 'A Reality Check can be used as a targeted decision basis before your next commercial choice.'
                  )}
                  {apiResult.outputType === 'Tidlig afklaring og videre orientering' && (
                    lang === 'da'
                      ? 'Start med at se de strategiske situationer og vurder, hvilken der passer bedst på jeres virkelighed.'
                      : 'Start by exploring the strategic situations and assess which one fits your reality best.'
                  )}
                </p>

                {/* 5. CTA Button / Action Area */}
                {followupSubmitted ? (
                  <div className="pt-2 pb-2 text-left space-y-3" id="followup-confirmation">
                    <h5 className="text-sm font-sans font-bold text-brand-charcoal">
                      {lang === 'da'
                        ? 'Jeres ønske er registreret.'
                        : 'Your request has been registered.'}
                    </h5>
                    <p className="text-xs sm:text-sm text-brand-muted font-sans leading-relaxed">
                      {lang === 'da'
                        ? 'Vi gennemgår jeres besvarelse og kontakter jer med forslag til et kort online afklaringsmøde.'
                        : 'We will review your answers and contact you with a proposal for a short online clarification call.'}
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={onNavigateToRealityCheck}
                        className="w-full sm:w-auto px-6 py-3.5 border border-brand-charcoal hover:bg-brand-charcoal/5 text-brand-charcoal font-mono font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>{lang === 'da' ? 'Gå videre på PeopleLab X' : 'Continue to PeopleLab X'}</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    <p className="text-xs sm:text-sm text-brand-muted font-sans leading-relaxed">
                      {lang === 'da'
                        ? 'Hvis I ønsker at forstå, hvad resultatet betyder i jeres konkrete markedsvirkelighed, kan I bede om et kort online afklaringsmøde.'
                        : 'If you would like to understand what the result means in your specific market reality, you can request a short online clarification call.'}
                    </p>

                    {followupError && (
                      <div className="p-4 bg-red-50 border-l-4 border-red-600 text-red-800 text-xs sm:text-sm font-sans flex items-start gap-2.5">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>{followupError}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleFollowup}
                        disabled={isFollowupSubmitting}
                        className="flex-1 px-4 py-3.5 bg-brand-accent hover:bg-brand-accent-dark disabled:bg-brand-accent/50 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 border-none cursor-pointer"
                      >
                        <span>
                          {isFollowupSubmitting 
                            ? (lang === 'da' ? 'Sender...' : 'Sending...')
                            : (lang === 'da' ? 'Bed om et afklarende online møde' : 'Request an online clarification call')}
                        </span>
                        {!isFollowupSubmitting && <ArrowRight size={12} />}
                      </button>

                      <button
                        onClick={onNavigateToRealityCheck}
                        className="flex-1 px-4 py-3.5 bg-transparent border border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal/5 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>{lang === 'da' ? 'Gå videre på PeopleLab X' : 'Continue to PeopleLab X'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Diskret note */}
              <div className="border-t border-brand-border/60 pt-4 text-center space-y-2">
                <p className="text-xs text-brand-muted font-sans italic">
                  {lang === 'da'
                    ? 'Indikatoren giver jer et første, overordnet billede af jeres situation. Den er ikke en fuld analyse, men den kan vise, hvor der kan være grund til at se nærmere.'
                    : 'The indicator gives you an initial, overall picture of your situation. It is not a full analysis, but it can show where there may be reason to look closer.'}
                </p>
                <p className="text-xs text-brand-muted font-sans italic">
                  {lang === 'da'
                    ? 'Hvis I ønsker en videre dialog om resultatet, kan I bede os kontakte jer.'
                    : 'If you want a further dialogue about the result, you can ask us to contact you.'}
                </p>
              </div>
            </div>

            {/* Restart indicator anchor */}
            <div className="pt-8 border-t border-brand-border flex justify-between items-center text-xs font-mono">
              <span className="text-brand-muted">
                {lang === 'da' ? 'ID: ' : 'ID: '} <span className="font-bold">{apiResult.opportunityId ? apiResult.opportunityId.substring(0, 8) : 'Pending'}</span>
              </span>
              <button
                onClick={() => {
                  setStage('landing');
                  setQ1('');
                  setQ2(3);
                  setQ3([]);
                  setQ4('');
                  setQ5(3);
                  setQ6([]);
                  setQ7([]);
                  setDecisionText('');
                  setFollowupSubmitted(false);
                }}
                className="text-brand-accent hover:text-brand-accent-dark font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1"
              >
                <span>{lang === 'da' ? 'Genstart afklaringsflow' : 'Restart assessment'}</span>
                <CornerDownRight size={12} />
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
