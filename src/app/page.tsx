import { HomeView } from '@/components/home/HomeView';
import { toFilters } from '@/lib/urlFilters';

/**
 * Server Component.
 *
 * 이 앱에서 서버가 하는 일은 하나뿐이다 — URL을 해석해서 Client에 넘긴다.
 * 데이터는 브라우저 localStorage에만 있으므로 서버는 조회할 수 없고,
 * 억지로 늘리면 존재하지 않는 데이터를 읽는 코드를 쓰게 된다.
 *
 * searchParams는 Promise다. Next 15에서 도입돼 16에서 동기 접근이 완전히 사라졌다.
 */
export default async function HomePage(props: PageProps<'/'>) {
  const raw = await props.searchParams;

  return <HomeView filters={toFilters(raw)} />;
}
