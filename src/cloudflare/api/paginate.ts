import Cloudflare from '.';

type Loader<R> = ({ per_page, page }: Pick<Cloudflare.ResponsePaginated['result_info'], 'per_page' | 'page'>) => Promise<Cloudflare.ResponsePaginated<R[]>>

/* Thanks to https://github.com/buschtoens/le-challenge-cloudflare for this great pagination implementation */
export async function* paginate<R>(loader: Loader<R>, per_page = 10) {
	for (let page = 1, finished = false; !finished; page++) {
		const response = await loader({ per_page, page });

		yield* response.result;

		finished = (page * response.result_info.per_page) >= response.result_info.total_count;
	}
}