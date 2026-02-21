const testPattern = (arg1, arg2, arg3) => {
    let req, res, next;
    if (arg1 && arg1.req && arg1.res && arg1.next) {
        req = arg1.req;
        res = arg1.res;
        next = arg1.next;
    } else {
        req = arg1;
        res = arg2;
        next = arg3;
    }
    return { req, res, next };
};

// Test Case 1: Standard Express Call
const standardRes = testPattern({ id: 'req' }, { id: 'res' }, () => 'next');
console.log('Standard:', standardRes.req.id === 'req' && standardRes.res.id === 'res' && typeof standardRes.next === 'function' ? 'PASS' : 'FAIL');

// Test Case 2: Wrapped Call
const wrappedRes = testPattern({
    req: { id: 'req_wrapped' },
    res: { id: 'res_wrapped' },
    next: () => 'next_wrapped'
});
console.log('Wrapped:', wrappedRes.req.id === 'req_wrapped' && wrappedRes.res.id === 'res_wrapped' && typeof wrappedRes.next === 'function' ? 'PASS' : 'FAIL');
