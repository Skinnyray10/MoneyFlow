import { useState, useEffect } from 'react'; 
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, TextInput, FlatList, TouchableOpacity } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { Picker } from '@react-native-picker/picker';

export default function App() {
  
  const [total, setTotal] = useState(0);
  const [cantidad, setCantidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Comida'); 
  const [gastos, setGastos] = useState<any[]>([]);

  // ¡NUEVO! Función para saber en qué mes estamos (Ejemplo: "2026-3")
  const obtenerMesActual = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${hoy.getMonth() + 1}`; // getMonth empieza en 0, por eso le sumamos 1
  };

  useEffect(() => {
    cargarDatos(); 
  }, []); 

  const cargarDatos = async () => {
    try {
      const gastosGuardados = await AsyncStorage.getItem('mis_gastos');
      if (gastosGuardados !== null) {
        const listaTraducida = JSON.parse(gastosGuardados);
        setGastos(listaTraducida); 
        recalcularTotal(listaTraducida); // Usamos una función separada para calcular el total
      }
    } catch (error) {
      console.log('Error al cargar datos:', error);
    }
  };

  // ¡NUEVO! Función inteligente que solo suma los gastos del mes en curso
  const recalcularTotal = (lista: any[]) => {
    const mesActual = obtenerMesActual();
    let totalCalculado = 0;
    
    lista.forEach((gasto: any) => {
      // Solo sumamos si la etiqueta del gasto coincide con nuestro mes actual
      if (gasto.mes === mesActual) {
        totalCalculado += gasto.monto;
      }
    });
    
    setTotal(totalCalculado);
  };

  const guardarDatos = async (nuevaListaDeGastos: any) => {
    try {
      const textoGuardar = JSON.stringify(nuevaListaDeGastos);
      await AsyncStorage.setItem('mis_gastos', textoGuardar);
    } catch (error) {
      console.log('Error al guardar datos:', error);
    }
  };

  const agregarGasto = () => {
    const numero = parseFloat(cantidad);
    if (numero > 0 && descripcion !== '') {
      const nuevoGasto = {
        id: Date.now().toString(), 
        nombre: descripcion,
        monto: numero,
        categoria: categoria,
        // ¡NUEVO! Le ponemos el sello del mes actual al "expediente"
        mes: obtenerMesActual() 
      };
      
      const nuevaLista = [...gastos, nuevoGasto];
      setGastos(nuevaLista); 
      recalcularTotal(nuevaLista); // Recalculamos
      setCantidad(''); 
      setDescripcion('');
      guardarDatos(nuevaLista);
    } else {
      alert('Por favor, ingresa una cantidad válida y una descripción.'); 
    }
  };

  const eliminarGasto = (idParaBorrar: string) => {
    const listaFiltrada = gastos.filter((gasto) => gasto.id !== idParaBorrar);
    setGastos(listaFiltrada); 
    recalcularTotal(listaFiltrada); // Recalculamos
    guardarDatos(listaFiltrada);
  };

  const reiniciarTodo = () => {
    setGastos([]); 
    setTotal(0);
    guardarDatos([]);
  };

  // ¡NUEVO! El resumen ahora también filtra por el mes actual
  const mesActual = obtenerMesActual();
  const resumenCategorias = gastos
    .filter((gasto) => gasto.mes === mesActual) // Primero filtramos al "cadenero"
    .reduce((acumulador, gasto) => {            // Luego hacemos los montoncitos
      const cat = gasto.categoria;
      if (!acumulador[cat]) {
        acumulador[cat] = 0;
      }
      acumulador[cat] += gasto.monto;
      return acumulador;
    }, {} as Record<string, number>);

  // ¡NUEVO! Obtenemos el nombre del mes para ponerlo bonito en el título
  const nombreMes = new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Actualizamos los títulos para que sean dinámicos */}
      <Text style={styles.title}>MoneyFlow 💸</Text>
      <Text style={styles.subtituloMes}>GASTOS DE {nombreMes}</Text>
      <Text style={styles.monto}>Total: ${total}</Text>

      {/* Solo mostramos el resumen si hay gastos ESTE MES */}
      {Object.keys(resumenCategorias).length > 0 && (
        <View style={styles.resumenContainer}>
          <Text style={styles.resumenTitulo}>Resumen del mes:</Text>
          <View style={styles.resumenGrid}>
            {Object.keys(resumenCategorias).map((cat) => (
              <View key={cat} style={styles.resumenItem}>
                <Text style={styles.resumenCatNombre}>{cat}</Text>
                <Text style={styles.resumenCatMonto}>${resumenCategorias[cat]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.formulario}>
        <TextInput 
          style={styles.input} 
          placeholder="¿En qué gastaste?" 
          value={descripcion} 
          onChangeText={(texto) => setDescripcion(texto)} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="¿Cuánto costó?" 
          keyboardType="numeric" 
          value={cantidad} 
          onChangeText={(texto) => setCantidad(texto)} 
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={categoria}
            onValueChange={(valorSeleccionado) => setCategoria(valorSeleccionado)}
          >
            <Picker.Item label="🍔 Comida" value="Comida" />
            <Picker.Item label="🚗 Transporte" value="Transporte" />
            <Picker.Item label="🏠 Hogar" value="Hogar" />
            <Picker.Item label="🎬 Ocio" value="Ocio" />
            <Picker.Item label="📦 Otros" value="Otros" />
          </Picker>
        </View>

        <View style={styles.botones}>
          <Button title="Agregar gasto" onPress={agregarGasto} />
          <Button title="Reiniciar" onPress={reiniciarTodo} color="#e74c3c" />
        </View>
      </View>

      <Text style={styles.subtitulo}>Historial del mes:</Text>
      
      <FlatList 
        // ¡NUEVO! A la lista visual también le pasamos solo los gastos de este mes
        data={gastos.filter(g => g.mes === mesActual)} 
        keyExtractor={(item) => item.id} 
        renderItem={({ item }) => ( 
          <View style={styles.itemGasto}>
            <View style={styles.infoGasto}>
              <Text style={styles.itemTexto}>{item.nombre}</Text>
              <Text style={styles.itemCategoria}>{item.categoria}</Text>
            </View>
            <View style={styles.accionesGasto}>
              <Text style={styles.itemPrecio}>${item.monto}</Text>
              <TouchableOpacity style={styles.botonBorrar} onPress={() => eliminarGasto(item.id)}>
                <Text style={styles.textoBorrar}>X</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#2c3e50' },
  subtituloMes: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: '#7f8c8d', marginBottom: 5, letterSpacing: 1 },
  monto: { fontSize: 26, marginBottom: 15, color: '#27ae60', fontWeight: 'bold', textAlign: 'center' },
  
  resumenContainer: { backgroundColor: '#e8f4f8', padding: 15, borderRadius: 10, marginBottom: 20 },
  resumenTitulo: { fontWeight: 'bold', color: '#2c3e50', marginBottom: 10, textAlign: 'center' },
  resumenGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  resumenItem: { backgroundColor: 'white', padding: 8, borderRadius: 8, minWidth: '45%', alignItems: 'center' },
  resumenCatNombre: { fontSize: 12, color: '#7f8c8d' },
  resumenCatMonto: { fontSize: 16, fontWeight: 'bold', color: '#2980b9' },

  formulario: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 16 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15, backgroundColor: '#f9f9f9', justifyContent: 'center' },
  botones: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 5 },
  subtitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#555' },
  itemGasto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 8, borderLeftWidth: 5, borderLeftColor: '#2980b9' },
  infoGasto: { flex: 1 },
  itemTexto: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  itemCategoria: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  accionesGasto: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  itemPrecio: { fontSize: 16, fontWeight: 'bold', color: '#e74c3c' },
  botonBorrar: { backgroundColor: '#ffeeee', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
  textoBorrar: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});