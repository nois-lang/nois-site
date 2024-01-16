import { Module } from 'nois/ast'
import { Package } from 'nois/package'
import { buildModule } from 'nois/package/build'
import { pathToVid } from 'nois/scope'
import { Source } from 'nois/source'

export const buildPackageFromVids = async (name: string, paths: string[]): Promise<Package> => {
    const sources: Source[] = await Promise.all(
        paths.map(async filepath => {
            const res = await fetch(filepath)
            const text = await res.text()
            return { code: text, filepath }
        })
    )
    const modules = sources.map(s => buildModule(s, pathToVid(s.filepath)))
    return { path: name, name, modules: <Module[]>modules }
}
