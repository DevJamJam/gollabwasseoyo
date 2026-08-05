import { DecisionDetailView } from '@/components/decision/DecisionDetailView';

/**
 * Server Component.
 *
 * params에서 id 문자열만 꺼내 Client에 넘긴다.
 * 여기서 notFound()를 부르면 안 된다 — 데이터가 브라우저에만 있어서
 * 서버는 그 id가 존재하는지 알 수 없다. 아직 읽지도 않은 상태에서
 * 404를 띄우게 된다.
 *
 * params는 Promise다. Next 15에서 도입돼 16에서 동기 접근이 사라졌다.
 */
export default async function DecisionDetailPage(
  props: PageProps<'/decisions/[id]'>,
) {
  const { id } = await props.params;

  return <DecisionDetailView id={id} />;
}
