import { DecisionForm } from '@/components/decision/DecisionForm';

/**
 * Server Component. 넘길 것이 없어 셸만 그린다.
 *
 * 등록은 2단계지만 라우트는 여기 하나뿐이다.
 * 단계 전환은 DecisionForm 안의 step 상태가 한다.
 */
export default function NewDecisionPage() {
  return <DecisionForm />;
}
