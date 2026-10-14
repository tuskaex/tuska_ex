import 'package:flutter_test/flutter_test.dart';
import 'package:tuskaex_app/core/format.dart';
import 'package:tuskaex_app/models/models.dart';

void main() {
  test('parses Decimal-as-string API values', () {
    expect(toD('10000.00000000'), 10000);
    expect(toD('0E-8'), 0);
    expect(toD(null, 5), 5);
    expect(toDN('abc'), isNull);
  });

  test('snaps lots to the instrument step and limits', () {
    expect(snapLots(0.137, 0.01, 0.01, 100), 0.14);
    expect(snapLots(0.001, 0.01, 0.01, 100), 0.01);
    expect(snapLots(500, 0.01, 0.01, 100), 100);
  });

  test('flags stale ticks and splits metals out of commodities', () {
    expect(Tick.fromJson({'symbol': 'XAUUSD', 'bid': 1, 'ask': 1, 'stale': true})!.stale, isTrue);
    expect(Tick.fromJson({'symbol': 'XAUUSD', 'bid': 0, 'ask': 1}), isNull);
    final t = Tick.fromJson({'symbol': 'xauusd', 'bid': '4100.5', 'ask': 4100.9, 'ts_ms': 1});
    expect(t!.symbol, 'XAUUSD');
    expect(t.mid, closeTo(4100.7, 1e-9));
    final gold = Instrument.fromJson({'id': '1', 'symbol': 'XAUUSD', 'segment': 'commodities'});
    expect(gold.group, 'metals');
    final oil = Instrument.fromJson({'id': '2', 'symbol': 'USOIL', 'segment': 'commodities'});
    expect(oil.group, 'commodities');
  });
}

