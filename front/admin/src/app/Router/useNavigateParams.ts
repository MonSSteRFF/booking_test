import { useLocation } from "wouter";

export type PathSegments<Path extends string> =
	Path extends `${infer SegmentA}/${infer SegmentB}`
		? ParamOnly<SegmentA> | PathSegments<SegmentB>
		: ParamOnly<Path>;
export type ParamOnly<Segment extends string> =
	Segment extends `:${infer Param}` ? Param : never;
export type RouteParams<Path extends string> = {
	[Key in PathSegments<Path>]?: string;
};
export type PathOptions<Path extends string> = {
	params?: RouteParams<Path>;
	query?: Record<string, string>;
};

export const urlReplace = <Path extends string>(
	template: Path,
	replaceTo: RouteParams<Path>,
): string =>
	template
		.split("/")
		.map((p) => (replaceTo as Record<string, string>)[p.replace(":", "")] || p)
		.join("/");

export function compilePath<Path extends string>(
	url: Path,
	options?: PathOptions<Path>,
) {
	let fullUrl: string = url;
	if (options?.params) {
		fullUrl = urlReplace(url, options.params);
	}
	if (options?.query) {
		const searchParams = new URLSearchParams(options.query);
		fullUrl += `?${searchParams.toString()}`;
	}
	return fullUrl;
}

export const useNavigateParams = () => {
	const [_, navigate] = useLocation();

	return <Path extends string>(
		url: Path,
		options?: { params?: RouteParams<Path>; query?: Record<string, string> },
		navigatorOptions?: { replace?: boolean },
	) => {
		navigate(compilePath(url, options), navigatorOptions);
	};
};
