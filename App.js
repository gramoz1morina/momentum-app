import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Linking, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, SourceSans3_400Regular, SourceSans3_600SemiBold } from '@expo-google-fonts/source-sans-3';
import { Feather } from '@expo/vector-icons';
import { VENUE_QR, clubDay, todaySessions, suggestSession, addCheckins, correctCheckin } from './src/checkin.cjs';
import { member, makeSessions } from './src/demo.cjs';

const STORAGE = 'momentum.demo.checkins.v1';
const C = { bg: '#010C11', panel: '#06151C', cyan: '#C5FBFF', teal: '#2F7D82', pink: '#F2CECE', text: '#FCFCFC', muted: '#A8BDC6', line: '#24414B' };
const T = ({ children, style, ...props }) => <Text {...props} style={[s.text, style]}>{children}</Text>;
const Heading = ({ children }) => <T style={s.heading}>{children}</T>;
const Tag = ({ children, extra }) => <View style={[s.tag, extra && { backgroundColor: C.pink }]}><T style={{ color: extra ? C.bg : C.cyan, fontSize: 12 }}>{children}</T></View>;
const Button = ({ children, onPress, primary, icon, disabled }) => <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, primary && s.primary, (pressed || disabled) && { opacity: 0.55 }]}>{icon && <Feather name={icon} size={20} color={primary ? C.bg : C.cyan} />}<T style={[s.buttonText, primary && { color: C.bg }]}>{children}</T></Pressable>;
const Panel = ({ children, hero }) => <View style={[s.panel, hero && s.hero]}>{children}</View>;

function Momentum() {
  const [fontsLoaded, fontError] = useFonts({ SourceSans3_400Regular, SourceSans3_600SemiBold });
  const [screen, setScreen] = useState('home');
  const [now, setNow] = useState(new Date());
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [selected, setSelected] = useState([]);
  const [lastSession, setLastSession] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraError, setCameraError] = useState(false);
  const [foreground, setForeground] = useState(true);
  const scanLock = useRef(false);
  const scanId = useRef('');
  const writeQueue = useRef(Promise.resolve());
  const day = clubDay(now);
  const sessions = makeSessions(now);
  const today = todaySessions(sessions, now);
  const checked = rows.filter(r => r.memberId === member.id).map(r => r.sessionId);
  const next = suggestSession(sessions, now);
  const go = page => { if (page === 'scan') { scanLock.current = false; setCameraError(false); } setNow(new Date()); setScreen(page); };
  useEffect(() => {
    AsyncStorage.getItem(STORAGE).then(value => {
      if (value) { const parsed = JSON.parse(value); if (!Array.isArray(parsed) || parsed.some(r => !r || typeof r.sessionId !== 'string' || typeof r.memberId !== 'string')) throw new Error('invalid data'); setRows(parsed); }
    }).catch(() => setStorageError(true)).finally(() => setLoaded(true));
    const timer = setInterval(() => setNow(new Date()), 30000);
    const sub = AppState.addEventListener('change', state => { setForeground(state === 'active'); if (state === 'active') setNow(new Date()); });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (screen === 'home') return false; go('home'); return true; });
    return () => sub.remove();
  }, [screen]);
  function persist(nextRows) {
    setRows(nextRows);
    writeQueue.current = writeQueue.current.then(() => AsyncStorage.setItem(STORAGE, JSON.stringify(nextRows))).then(() => setStorageError(false)).catch(() => setStorageError(true));
  }
  function save(ids, correction = false) {
    try {
      const options = { memberId: member.id, sessionIds: ids, sessions, scanId: scanId.current || `demo-${Date.now()}`, now: new Date() };
      persist(correction ? correctCheckin(rows, { ...options, oldSessionId: lastSession, newSessionId: ids[0] }) : addCheckins(rows, options));
      if (ids.length) setLastSession(ids[0]);
      go('success');
    } catch (error) { Alert.alert('Kunde inte checka in', error.message); go('calendar'); }
  }
  function scan(data) {
    if (scanLock.current) return;
    scanLock.current = true;
    if (data !== VENUE_QR) { Alert.alert('Fel QR-kod', 'Använd Momentum IF:s testkod.', [{ text: 'Försök igen', onPress: () => { scanLock.current = false; } }], { cancelable: false }); return; }
    scanId.current = `scan-${Date.now()}`;
    const suggested = suggestSession(sessions, new Date());
    setLastSession(null);
    if (suggested) save([suggested.id]); else { setSelected([]); go('choose'); }
  }
  function Session({ item, onPress }) {
    return <View style={s.session}><View style={s.row}><T style={s.muted}>{item.date === day ? 'Idag' : item.date} · {item.start}–{item.end}</T>{item.extra && <Tag extra>Extra</Tag>}</View><T style={s.sessionTitle}>{item.name}</T>{checked.includes(item.id) && <Tag>Incheckad</Tag>}{onPress && <Button onPress={onPress}>Välj detta pass</Button>}</View>;
  }
  const back = target => <Button icon="arrow-left" onPress={() => go(target)}>Tillbaka</Button>;
  const comingSoon = text => Alert.alert('Nästa etapp', text);
  if ((!fontsLoaded && !fontError) || !loaded) return <SafeAreaView style={s.safe}><ActivityIndicator color={C.cyan} accessibilityLabel="Laddar Momentum" /></SafeAreaView>;
  let content;
  if (screen === 'home') content = <><T style={s.eyebrow}>DIN KLUBB. DIN UTVECKLING.</T><Heading>Hej, {member.firstName}.</Heading><View style={s.row}><Tag>Testmedlem</Tag><T style={s.muted}>{member.group}</T></View><Panel hero><T style={s.muted}>Pågående eller nästa pass idag</T><Heading>{next ? next.name : 'Vi ses på mattan'}</Heading><T>{next ? `${next.start}–${next.end}` : 'Inga fler pass idag'}</T><T style={s.muted}>Momentum IF · Karlshamn</T><Button primary icon="maximize" onPress={() => go('scan')}>Checka in med QR</Button></Panel><T style={s.sectionTitle}>Från föreningen</T><Panel><Tag extra>Exempelnyhet</Tag><T style={s.sessionTitle}>Vi ses på mattan!</T><T style={s.muted}>Höstens träning är igång. Ta gärna med en vän som vill prova på.</T></Panel><Button icon="award" onPress={() => go('competition')}>Tävlingskalender</Button></>;
  if (screen === 'calendar') content = <><T style={s.eyebrow}>TRÄNING & TÄVLING</T><Heading>Din kalender</Heading><T style={s.muted}>Kommande sju dagar · exempelschema</T>{sessions.map(item => <Session key={item.id} item={item} />)}<Button onPress={() => go('competition')}>Tävlingskalender</Button></>;
  if (screen === 'scan') content = <>{back('home')}<Heading>Checka in</Heading><T style={s.muted}>Skanna föreningens QR-kod för att checka in på dagens pass.</T>{!permission || !permission.granted ? <Panel><Feather name="camera" size={32} color={C.cyan} /><T>Kameran används bara för att läsa QR-koden.</T><Button primary onPress={() => permission?.canAskAgain === false ? Linking.openSettings().catch(() => Alert.alert('Öppna inställningarna', 'Tillåt kamera för Momentum IF i telefonens inställningar.')) : requestPermission().catch(() => setCameraError(true))}>{permission?.canAskAgain === false ? 'Öppna inställningar' : 'Tillåt kamera'}</Button></Panel> : foreground && !cameraError ? <View style={s.camera}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => scan(data)} onMountError={() => setCameraError(true)} /><View pointerEvents="none" style={s.target} /></View> : <Panel><T>Kameran kunde inte starta. Kontrollera behörigheten och försök igen.</T></Panel>}<T style={s.muted}>Testversion: använd testkoden i repot eller prova knappen nedan.</T><Button onPress={() => scan(VENUE_QR)}>Simulera skanning</Button></>;
  if (screen === 'success') content = <><Feather name="check-circle" size={44} color={C.cyan} /><Heading>Välkommen {member.firstName}!</Heading><T>Du är incheckad på:</T><Panel hero>{today.filter(x => checked.includes(x.id)).map(item => <Session key={item.id} item={item} />)}</Panel>{lastSession && <Button onPress={() => go('correct')}>Fel pass? Välj annat</Button>}<Button onPress={() => { setSelected([]); go('choose'); }}>Kör du fler pass idag? Checka in på fler</Button><Button primary onPress={() => go('home')}>Klart</Button></>;
  if (screen === 'correct') content = <>{back('success')}<Heading>Välj rätt pass</Heading><T style={s.muted}>Byter den senast valda incheckningen.</T>{today.map(item => <Session key={item.id} item={item} onPress={() => save([item.id], true)} />)}</>;
  if (screen === 'choose') content = <>{back('home')}<Heading>Välj dagens pass</Heading><T style={s.muted}>Välj ett eller flera pass. Redan incheckade pass räknas bara en gång.</T>{!today.length && <Panel><T>Det finns inga pass idag.</T></Panel>}{today.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: checked.includes(item.id) || selected.includes(item.id), disabled: checked.includes(item.id) }} disabled={checked.includes(item.id)} onPress={() => setSelected(value => value.includes(item.id) ? value.filter(id => id !== item.id) : [...value, item.id])} style={s.choice}><Feather name={checked.includes(item.id) || selected.includes(item.id) ? 'check-square' : 'square'} size={24} color={C.cyan} /><View style={{ flex: 1 }}><T>{item.name}</T><T style={s.muted}>{item.start}–{item.end}{checked.includes(item.id) ? ' · Incheckad' : ''}</T></View></Pressable>)}<Button primary disabled={!selected.length} onPress={() => save(selected)}>Bekräfta incheckning</Button></>;
  if (screen === 'group') content = <><T style={s.eyebrow}>GEMENSKAP</T><Heading>Min grupp · BJJ</Heading><T style={s.sectionTitle}>Instruktör</T><Button icon="message-circle" onPress={() => comingSoon('Privata meddelanden kopplas på tillsammans med medlemsinloggningen. Inga meddelanden skickas i testversionen.')}>Skriv till Gramoz</Button><T style={s.sectionTitle}>Exempelmedlemmar</T>{['Alex · Du', 'Kim', 'Robin'].map(name => <View key={name} style={s.session}><T>{name}</T></View>)}</>;
  if (screen === 'profile') content = <><T style={s.eyebrow}>MITT MOMENTUM</T><Heading>{member.name}</Heading><Tag>{member.group}</Tag><Panel hero><T style={s.sessionTitle}>Exempelmedlemskap</T><T>Medlem sedan {member.since}</T><T style={s.muted}>Aktiv till</T><Heading>30 september 2026</Heading></Panel><Button onPress={() => comingSoon('Vi behöver föreningens Swish-nummer och medlemsavgifter innan betalningsknapparna aktiveras.')}>Förnya medlemskap</Button><Panel><T style={s.sectionTitle}>Min träning</T><T>{today.filter(x => checked.includes(x.id)).length} pass incheckade idag</T><T style={s.muted}>Testincheckningarna sparas på den här enheten.</T></Panel></>;
  if (screen === 'competition') content = <>{back('calendar')}<Heading>Tävlingskalender</Heading><Panel><Tag extra>Exempeltävling</Tag><T style={s.sessionTitle}>Hösttävling BJJ</T><T>24 oktober 2026 · Malmö</T><T style={s.muted}>Här kommer information om anmälan, hotell, resa och samling.</T></Panel><Button onPress={() => comingSoon('Admin lägger in den riktiga anmälningslänken när backend är ansluten.')}>Till anmälan</Button></>;
  if (screen === 'admin') content = <>{back('home')}<T style={s.eyebrow}>ADMIN · FÖRHANDSVISNING</T><Heading>Föreningen</Heading><T style={s.muted}>I den färdiga appen krävs en administratörsroll. Den här vyn innehåller bara testdata.</T><Panel><T style={s.sectionTitle}>Dagens incheckningar</T>{today.map(item => <View key={item.id} style={s.session}><T>{item.name}</T><T style={s.muted}>{item.start} · {rows.filter(r => r.sessionId === item.id).length} incheckade</T></View>)}</Panel>{['Medlemmar & betalningar', 'Schema & extra event', 'Nyheter & tävlingar', 'Push-notiser & logg'].map(label => <Button key={label} onPress={() => comingSoon(`${label} kopplas på i nästa etapp med databas och behörighetskontroll.`)}>{label}</Button>)}</>;
  const tabs = [['home', 'Hem', 'home'], ['calendar', 'Kalender', 'calendar'], ['scan', 'Checka in', 'maximize'], ['group', 'Grupp', 'users'], ['profile', 'Profil', 'user']];
  return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content" /><View style={s.header}><T style={s.brand}>MOMENTUM <T style={{ color: C.cyan }}>IF</T></T><Pressable accessibilityRole="button" onPress={() => go('admin')} style={s.admin}><T style={{ color: C.cyan }}>Admin</T></Pressable></View><View style={s.demo}><T style={s.demoText}>TESTVERSION · EXEMPELDATA</T></View>{storageError && <View style={s.demo}><T accessibilityRole="alert">Lokal lagring är inte tillgänglig. Incheckningar kan försvinna när appen stängs.</T></View>}<ScrollView key={screen} contentContainerStyle={s.content}>{content}</ScrollView><View style={s.nav}>{tabs.map(([id, label, icon]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: screen === id }} onPress={() => go(id)} style={[s.tab, screen === id && s.activeTab]}><Feather name={icon} size={21} color={screen === id || id === 'scan' ? C.cyan : C.muted} /><T style={[s.tabLabel, screen === id && { color: C.cyan }]}>{label}</T></Pressable>)}</View></SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><Momentum /></SafeAreaProvider>; }
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, text: { fontFamily: 'SourceSans3_400Regular', color: C.text, fontSize: 16, lineHeight: 24 },
  heading: { fontFamily: 'SourceSans3_600SemiBold', fontSize: 30, lineHeight: 36, marginVertical: 12 }, muted: { color: C.muted },
  header: { paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: C.line },
  brand: { letterSpacing: 2, fontFamily: 'SourceSans3_600SemiBold', flexShrink: 1 }, admin: { minHeight: 48, justifyContent: 'center', paddingLeft: 12 },
  demo: { backgroundColor: '#12313A', paddingHorizontal: 20, paddingVertical: 6 }, demoText: { color: C.cyan, fontSize: 11, letterSpacing: 1 },
  content: { padding: 22, paddingBottom: 32, maxWidth: 640, width: '100%', alignSelf: 'center' }, eyebrow: { fontSize: 12, letterSpacing: 2, color: C.cyan },
  panel: { padding: 18, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, gap: 10, marginVertical: 14 }, hero: { backgroundColor: '#0E3038', borderColor: C.teal },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }, tag: { alignSelf: 'flex-start', backgroundColor: '#193D43', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  sectionTitle: { fontSize: 20, fontFamily: 'SourceSans3_600SemiBold', marginTop: 12 }, sessionTitle: { fontSize: 21, fontFamily: 'SourceSans3_600SemiBold', marginVertical: 6 },
  session: { paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line, gap: 6 },
  button: { minHeight: 48, backgroundColor: '#10252E', padding: 14, borderRadius: 9, marginVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 10 }, primary: { backgroundColor: C.cyan }, buttonText: { flexShrink: 1, fontFamily: 'SourceSans3_600SemiBold' },
  nav: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.line, backgroundColor: C.panel, paddingHorizontal: 4, paddingVertical: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 56, paddingVertical: 6, borderRadius: 8 }, activeTab: { backgroundColor: '#12313A' }, tabLabel: { fontSize: 11, lineHeight: 16, color: C.muted, textAlign: 'center' },
  camera: { height: 270, marginVertical: 20, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, target: { width: 180, height: 180, borderWidth: 2, borderColor: C.cyan, borderRadius: 16 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line },
});
