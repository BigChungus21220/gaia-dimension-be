class Molang:
    """
    A library for generating Molang math strings. 
    Arguments can be numbers or strings (existing Molang expressions).
    """

    @staticmethod
    def _wrap(val):
        return str(val)

    # --- Basic Functions ---
    @staticmethod
    def abs(v): return f"math.abs({Molang._wrap(v)})"
    
    @staticmethod
    def acos(v): return f"math.acos({Molang._wrap(v)})"
    
    @staticmethod
    def asin(v): return f"math.asin({Molang._wrap(v)})"
    
    @staticmethod
    def atan(v): return f"math.atan({Molang._wrap(v)})"
    
    @staticmethod
    def atan2(y, x): return f"math.atan2({Molang._wrap(y)}, {Molang._wrap(x)})"
    
    @staticmethod
    def ceil(v): return f"math.ceil({Molang._wrap(v)})"
    
    @staticmethod
    def clamp(v, mi, ma): return f"math.clamp({Molang._wrap(v)}, {Molang._wrap(mi)}, {Molang._wrap(ma)})"
    
    @staticmethod
    def copy_sign(a, b): return f"math.copy_sign({Molang._wrap(a)}, {Molang._wrap(b)})"
    
    @staticmethod
    def cos(v): return f"math.cos({Molang._wrap(v)})"
    
    @staticmethod
    def die_roll(n, l, h): return f"math.die_roll({Molang._wrap(n)}, {Molang._wrap(l)}, {Molang._wrap(h)})"
    
    @staticmethod
    def die_roll_integer(n, l, h): return f"math.die_roll_integer({Molang._wrap(n)}, {Molang._wrap(l)}, {Molang._wrap(h)})"
    
    @staticmethod
    def exp(v): return f"math.exp({Molang._wrap(v)})"
    
    @staticmethod
    def floor(v): return f"math.floor({Molang._wrap(v)})"
    
    @staticmethod
    def hermite_blend(v): return f"math.hermite_blend({Molang._wrap(v)})"
    
    @staticmethod
    def inverse_lerp(s, e, v): return f"math.inverse_lerp({Molang._wrap(s)}, {Molang._wrap(e)}, {Molang._wrap(v)})"
    
    @staticmethod
    def lerp(s, e, t): return f"math.lerp({Molang._wrap(s)}, {Molang._wrap(e)}, {Molang._wrap(t)})"
    
    @staticmethod
    def lerprotate(s, e, t): return f"math.lerprotate({Molang._wrap(s)}, {Molang._wrap(e)}, {Molang._wrap(t)})"
    
    @staticmethod
    def ln(v): return f"math.ln({Molang._wrap(v)})"
    
    @staticmethod
    def max(a, b): return f"math.max({Molang._wrap(a)}, {Molang._wrap(b)})"
    
    @staticmethod
    def min(a, b): return f"math.min({Molang._wrap(a)}, {Molang._wrap(b)})"
    
    @staticmethod
    def min_angle(v): return f"math.min_angle({Molang._wrap(v)})"
    
    @staticmethod
    def mod(v, d): return f"math.mod({Molang._wrap(v)}, {Molang._wrap(d)})"
    
    @property
    def pi(self): return "math.pi"
    
    @staticmethod
    def pow(b, e): return f"math.pow({Molang._wrap(b)}, {Molang._wrap(e)})"
    
    @staticmethod
    def random(l, h): return f"math.random({Molang._wrap(l)}, {Molang._wrap(h)})"
    
    @staticmethod
    def random_integer(l, h): return f"math.random_integer({Molang._wrap(l)}, {Molang._wrap(h)})"
    
    @staticmethod
    def round(v): return f"math.round({Molang._wrap(v)})"
    
    @staticmethod
    def sign(v): return f"math.sign({Molang._wrap(v)})"
    
    @staticmethod
    def sin(v): return f"math.sin({Molang._wrap(v)})"
    
    @staticmethod
    def sqrt(v): return f"math.sqrt({Molang._wrap(v)})"
    
    @staticmethod
    def trunc(v): return f"math.trunc({Molang._wrap(v)})"

    # --- Easing Helpers ---
    @staticmethod
    def ease(type, start, end, t):
        """Helper for all math.ease_... functions"""
        return f"math.ease_{type}({Molang._wrap(start)}, {Molang._wrap(end)}, {Molang._wrap(t)})"

    # Example of specific easing if needed:
    @staticmethod
    def ease_in_out_back(s, e, t): return Molang.ease("in_out_back", s, e, t)
    
    # --- Logical/Arithmetic Wrappers (Non-math. prefixed) ---
    @staticmethod
    def query(q): return f"query.{q}"
    
    @staticmethod
    def variable(v): return f"variable.{v}"

    @staticmethod
    def add(a, b): return f"({Molang._wrap(a)} + {Molang._wrap(b)})"
    
    @staticmethod
    def sub(a, b): return f"({Molang._wrap(a)} - {Molang._wrap(b)})"
    
    @staticmethod
    def mul(a, b): return f"({Molang._wrap(a)} * {Molang._wrap(b)})"
    
    @staticmethod
    def div(a, b): return f"({Molang._wrap(a)} / {Molang._wrap(b)})"
