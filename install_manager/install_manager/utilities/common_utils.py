
def is_not_blank(s: str) -> bool:
    return not is_blank(s)

def is_blank(s: str) -> bool:
    return s is None or s.strip() == ''
