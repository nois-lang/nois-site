export const encode = (str: string): string => {
    return btoa(encodeURIComponent(str))
}

export const decode = (str: string): string => {
    return decodeURIComponent(atob(str))
}
